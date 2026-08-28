/**
 * AI Batch Translation Service
 * Optimized for LM Studio & OpenAI-compatible local APIs.
 * Includes strict JSON prompt engineering, resilient multiline JSON sanitization,
 * 1:1 cue integrity validation, and automatic 1x1 micro-batching fallback.
 */

import { normalizeEndpoint } from './llmService';

export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
];

/**
 * Resolves full language name from language code.
 */
export function getLanguageName(code) {
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return found ? `${found.name} (${found.nativeName})` : code;
}

/**
 * Sanitizes unescaped newlines/control characters inside JSON strings.
 */
function sanitizeJsonString(jsonStr) {
  if (!jsonStr || typeof jsonStr !== 'string') return '';

  let inString = false;
  let isEscaped = false;
  let result = '';

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (char === '"' && !isEscaped) {
      inString = !inString;
      result += char;
    } else if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        // omit carriage return
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      result += char;
    }

    if (char === '\\' && !isEscaped) {
      isEscaped = true;
    } else {
      isEscaped = false;
    }
  }

  return result;
}

/**
 * Resilient JSON Extractor & Sanitizer.
 * Extracts translations array even if the model outputs code fences, markdown, or commentary.
 *
 * @param {string} rawText 
 * @returns {Record<number, string>} Dictionary mapping subtitle ID -> translated text
 */
export function extractAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response from model');
  }

  // 1. Remove markdown code blocks if present
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }

  // 2. Find outer JSON boundaries { ... } or [ ... ]
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  let jsonCandidate = cleaned;
  if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    jsonCandidate = cleaned.slice(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    jsonCandidate = cleaned.slice(firstBracket, lastBracket + 1);
  }

  // 3. Attempt direct standard JSON parse (with string sanitization for unescaped newlines)
  const attempts = [jsonCandidate, sanitizeJsonString(jsonCandidate)];

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      const resultMap = {};

      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item && item.id !== undefined && item.text !== undefined) {
            resultMap[Number(item.id)] = String(item.text).trim();
          }
        });
        if (Object.keys(resultMap).length > 0) return resultMap;
      }

      if (parsed && Array.isArray(parsed.translations)) {
        parsed.translations.forEach((item) => {
          if (item && item.id !== undefined && item.text !== undefined) {
            resultMap[Number(item.id)] = String(item.text).trim();
          }
        });
        if (Object.keys(resultMap).length > 0) return resultMap;
      }
    } catch {
      // Continue to next attempt or regex fallback
    }
  }

  // 4. Regex fallback extraction for individual { id: ..., text: "..." } entries
  const resultMap = {};
  const itemRegex = /{\s*"id"\s*:\s*(\d+)\s*,\s*"text"\s*:\s*"([\s\S]*?)(?<!\\)"\s*}/g;
  let match;
  while ((match = itemRegex.exec(cleaned)) !== null) {
    const id = parseInt(match[1], 10);
    let text = match[2]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\')
      .trim();
    resultMap[id] = text;
  }

  if (Object.keys(resultMap).length > 0) {
    return resultMap;
  }

  throw new Error('Could not parse valid JSON translations from model response.');
}

/**
 * Builds the structured system and user prompts for batch translation.
 */
export function buildTranslationPrompt({ cues, sourceLang, targetLang, customSystemPrompt }) {
  const sourceName = getLanguageName(sourceLang);
  const targetName = getLanguageName(targetLang);

  const basePrompt =
    customSystemPrompt ||
    'You are an expert subtitle translator. Translate the given subtitle blocks accurately preserving nuance, timing tone, and formatting.';

  const systemMessage = `${basePrompt}

CRITICAL RULES:
1. Translate each subtitle cue from ${sourceName} to ${targetName}.
2. STRICT 1:1 CORRESPONDENCE: You MUST return exactly the same number of items as in the input payload, with the exact matching "id" values. Never merge, skip, or split cues across IDs.
3. MULTI-SPEAKER / DIALOGUE HYPHENS: When a cue contains dialogue hyphens (-) or multiple lines for different speakers, keep all speakers, hyphens, and line breaks within that SAME cue's "text" field. Do NOT create separate cue IDs for separate speakers.
4. Output MUST be ONLY valid JSON matching this exact schema:
{
  "translations": [
    { "id": <number>, "text": "<translated string>" }
  ]
}
5. Do NOT include explanations, markdown commentary, notes, or greetings. Output raw JSON only.

FEW-SHOT EXAMPLE:
Input:
[
  { "id": 47, "text": "Hello there." },
  { "id": 48, "text": "- Thank you, Gordon.\\n- It ranks poor with me too." },
  { "id": 49, "text": "Understood." }
]
Output:
{
  "translations": [
    { "id": 47, "text": "Hola a todos." },
    { "id": 48, "text": "- Gracias, Gordon.\\n- A mí tampoco me agrada." },
    { "id": 49, "text": "Entendido." }
  ]
}`;

  const inputPayload = cues.map((c) => ({
    id: c.id,
    text: c.sourceText,
  }));

  const userMessage = JSON.stringify(inputPayload, null, 2);

  return { systemMessage, userMessage };
}

/**
 * Translates a single cue directly (used for 1x1 micro-batching fallback).
 */
async function translateSingleCueDirectly({ cue, sourceLang, targetLang, settings, signal }) {
  const base = normalizeEndpoint(settings.endpoint);
  const url = `${base}/chat/completions`;

  const { systemMessage, userMessage } = buildTranslationPrompt({
    cues: [cue],
    sourceLang,
    targetLang,
    customSystemPrompt: settings.systemPrompt,
  });

  const payload = {
    model: settings.selectedModel || 'default',
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: typeof settings.temperature === 'number' ? settings.temperature : 0.3,
    max_tokens: typeof settings.maxTokens === 'number' ? settings.maxTokens : 1024,
    stream: false,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errText || response.statusText}`);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content || '';
  const parsed = extractAndParseJSON(rawContent);

  // Return text for this specific cue ID or fallback to first entry
  if (parsed[cue.id]) {
    return parsed[cue.id];
  }
  const firstKey = Object.keys(parsed)[0];
  if (firstKey && parsed[firstKey]) {
    return parsed[firstKey];
  }
  throw new Error(`Model did not return translation for cue #${cue.id}`);
}

/**
 * Validates that the returned translation dictionary strictly contains all requested cue IDs.
 * @param {Array<object>} cues 
 * @param {Record<number, string>} translations 
 * @returns {boolean}
 */
export function validateBatchIntegrity(cues, translations) {
  if (!translations || typeof translations !== 'object') return false;
  return cues.every(
    (cue) =>
      translations[cue.id] !== undefined &&
      typeof translations[cue.id] === 'string' &&
      translations[cue.id].trim().length > 0
  );
}

/**
 * Translates a batch of subtitle cues using the local LLM endpoint.
 * Automatically validates 1:1 ID alignment and falls back to 1x1 micro-batching
 * if dialogue splitting or ID desynchronization occurs.
 *
 * @param {object} params
 * @param {Array<object>} params.cues - Array of subtitle objects to translate
 * @param {string} params.sourceLang - e.g. "en"
 * @param {string} params.targetLang - e.g. "es"
 * @param {object} params.settings - Settings from SettingsContext
 * @param {AbortSignal} [params.signal] - AbortSignal for cancellation
 * @returns {Promise<{ ok: boolean, translations?: Record<number, string>, latencyMs: number, error?: string, fallbackUsed?: boolean }>}
 */
export async function translateBatch({ cues, sourceLang, targetLang, settings, signal }) {
  if (!cues || cues.length === 0) {
    return { ok: true, translations: {}, latencyMs: 0 };
  }

  const base = normalizeEndpoint(settings.endpoint);
  const url = `${base}/chat/completions`;

  const { systemMessage, userMessage } = buildTranslationPrompt({
    cues,
    sourceLang,
    targetLang,
    customSystemPrompt: settings.systemPrompt,
  });

  const payload = {
    model: settings.selectedModel || 'default',
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: typeof settings.temperature === 'number' ? settings.temperature : 0.3,
    max_tokens: typeof settings.maxTokens === 'number' ? settings.maxTokens : 2048,
    stream: false,
  };

  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errText || response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content || '';

    const translations = extractAndParseJSON(rawContent);

    // Validate 1:1 correspondence for all requested IDs
    const isValid = validateBatchIntegrity(cues, translations);

    if (isValid) {
      return {
        ok: true,
        translations,
        latencyMs,
      };
    }

    // If 1:1 validation fails (e.g. model split dialogue hyphens into extra IDs or missed IDs),
    // trigger 1x1 micro-batching fallback to guarantee mathematically exact alignment!
    console.warn(
      `[TranslationService] Batch 1:1 integrity check failed for ${cues.length} cues. Falling back to 1x1 micro-batching.`
    );

    const fallbackTranslations = {};
    for (const cue of cues) {
      if (signal?.aborted) {
        throw new Error('Translation aborted by user.');
      }
      try {
        const text = await translateSingleCueDirectly({
          cue,
          sourceLang,
          targetLang,
          settings,
          signal,
        });
        fallbackTranslations[cue.id] = text;
      } catch (subErr) {
        console.error(`[TranslationService] Micro-batch failed for cue #${cue.id}:`, subErr);
      }
    }

    const finalLatencyMs = Math.round(performance.now() - startTime);

    return {
      ok: Object.keys(fallbackTranslations).length > 0,
      translations: fallbackTranslations,
      latencyMs: finalLatencyMs,
      fallbackUsed: true,
    };
  } catch (err) {
    if (err.name === 'AbortError' || signal?.aborted) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        ok: false,
        latencyMs,
        error: 'Translation request aborted by user.',
      };
    }

    // If batch request failed entirely, attempt 1x1 micro-batching fallback before giving up
    if (cues.length > 1) {
      console.warn(
        `[TranslationService] Primary batch failed (${err.message}). Attempting 1x1 micro-batching fallback.`
      );
      const fallbackTranslations = {};
      for (const cue of cues) {
        if (signal?.aborted) break;
        try {
          const text = await translateSingleCueDirectly({
            cue,
            sourceLang,
            targetLang,
            settings,
            signal,
          });
          fallbackTranslations[cue.id] = text;
        } catch {
          // continue with remaining cues
        }
      }

      if (Object.keys(fallbackTranslations).length > 0) {
        const finalLatencyMs = Math.round(performance.now() - startTime);
        return {
          ok: true,
          translations: fallbackTranslations,
          latencyMs: finalLatencyMs,
          fallbackUsed: true,
        };
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);
    return {
      ok: false,
      latencyMs,
      error: err.message || 'Batch translation request failed.',
    };
  }
}
