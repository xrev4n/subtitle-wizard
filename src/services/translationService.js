/**
 * AI Batch Translation Service
 * Optimized for LM Studio & OpenAI-compatible local APIs.
 * Includes strict JSON prompt engineering and resilient JSON sanitization.
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

  // 3. Attempt direct standard JSON parse
  try {
    const parsed = JSON.parse(jsonCandidate);
    const resultMap = {};

    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        if (item && item.id !== undefined && item.text !== undefined) {
          resultMap[Number(item.id)] = String(item.text).trim();
        }
      });
      return resultMap;
    }

    if (parsed && Array.isArray(parsed.translations)) {
      parsed.translations.forEach((item) => {
        if (item && item.id !== undefined && item.text !== undefined) {
          resultMap[Number(item.id)] = String(item.text).trim();
        }
      });
      return resultMap;
    }
  } catch {
    // Continue to regex fallback extraction if JSON.parse fails due to unescaped characters
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

CRITICAL INSTRUCTIONS:
1. Translate each subtitle cue from ${sourceName} to ${targetName}.
2. Preserve all internal line breaks, capitalization, punctuation, and speaker markers (-).
3. Do NOT skip, combine, or add any subtitle block.
4. Output MUST be ONLY valid JSON matching this exact schema:
{
  "translations": [
    { "id": <number>, "text": "<translated string>" }
  ]
}
5. Do NOT include explanations, markdown commentary, notes, or greetings. Output raw JSON only.`;

  const inputPayload = cues.map((c) => ({
    id: c.id,
    text: c.sourceText,
  }));

  const userMessage = JSON.stringify(inputPayload, null, 2);

  return { systemMessage, userMessage };
}

/**
 * Translates a batch of subtitle cues using the local LLM endpoint.
 *
 * @param {object} params
 * @param {Array<object>} params.cues - Array of subtitle objects to translate
 * @param {string} params.sourceLang - e.g. "en"
 * @param {string} params.targetLang - e.g. "es"
 * @param {object} params.settings - Settings from SettingsContext
 * @param {AbortSignal} [params.signal] - AbortSignal for cancellation
 * @returns {Promise<{ ok: boolean, translations?: Record<number, string>, latencyMs: number, error?: string }>}
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
      return {
        ok: false,
        latencyMs,
        error: `HTTP ${response.status}: ${errText || response.statusText}`,
      };
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content || '';

    const translations = extractAndParseJSON(rawContent);

    return {
      ok: true,
      translations,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    if (err.name === 'AbortError') {
      return {
        ok: false,
        latencyMs,
        error: 'Translation request aborted by user.',
      };
    }

    return {
      ok: false,
      latencyMs,
      error: err.message || 'Batch translation request failed.',
    };
  }
}
