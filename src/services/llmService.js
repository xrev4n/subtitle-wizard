/**
 * Dual LLM Inference Service (LM Studio Local & OpenRouter Cloud BYOK)
 * 100% In-Browser native fetch with AbortController timeout and zero external dependencies.
 */

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export const OPENROUTER_POPULAR_MODELS = [
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (Chat)', provider: 'DeepSeek' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Reasoning)', provider: 'DeepSeek' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', provider: 'Meta' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'mistralai/mistral-small-24b-instruct-2501', name: 'Mistral Small 24B', provider: 'Mistral' },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct', provider: 'Qwen' },
];

/**
 * Normalizes an API endpoint URL (strips trailing slashes)
 * @param {string} endpoint 
 * @returns {string}
 */
export function normalizeEndpoint(endpoint) {
  if (!endpoint || typeof endpoint !== 'string') {
    return 'http://localhost:1234/v1';
  }
  return endpoint.trim().replace(/\/+$/, '');
}

/**
 * Generates provider configuration, endpoint URL, and authorization headers.
 * @param {object} settings 
 * @returns {{ isOR: boolean, baseUrl: string, headers: Record<string, string>, defaultModel: string }}
 */
export function getProviderConfig(settings = {}) {
  const isOR = settings.provider === 'openrouter';
  const baseUrl = isOR ? OPENROUTER_BASE_URL : normalizeEndpoint(settings.endpoint);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (isOR) {
    if (settings.openRouterKey && settings.openRouterKey.trim()) {
      headers['Authorization'] = `Bearer ${settings.openRouterKey.trim()}`;
    }
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:5173';
    headers['HTTP-Referer'] = origin;
    headers['X-Title'] = 'Subtitle Wizard';
  }

  const defaultModel = isOR ? 'deepseek/deepseek-chat' : 'default';

  return {
    isOR,
    baseUrl,
    headers,
    defaultModel,
  };
}

/**
 * Validates connection to the selected LLM provider and measures round-trip latency.
 * @param {object|string} settingsOrEndpoint
 * @param {number} [timeoutMs=6000]
 * @returns {Promise<{
 *   ok: boolean,
 *   latencyMs: number,
 *   models: Array<string>,
 *   error?: string,
 *   isCorsOrOffline?: boolean
 * }>}
 */
export async function checkConnection(settingsOrEndpoint, timeoutMs = 6000) {
  const settings = typeof settingsOrEndpoint === 'string'
    ? { provider: 'lmstudio', endpoint: settingsOrEndpoint }
    : settingsOrEndpoint || {};

  const { isOR, baseUrl, headers } = getProviderConfig(settings);

  // If OpenRouter is chosen without key, prompt user
  if (isOR && (!settings.openRouterKey || !settings.openRouterKey.trim())) {
    return {
      ok: false,
      latencyMs: 0,
      models: OPENROUTER_POPULAR_MODELS.map((m) => m.id),
      error: 'OpenRouter API Key no configurada. Ingresa tu clave para conectar.',
      isCorsOrOffline: false,
    };
  }

  const url = `${baseUrl}/models`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      let errorMsg = `HTTP ${response.status}: ${errText || response.statusText}`;

      if (response.status === 401) {
        errorMsg = 'API Key inválida o no autorizada (HTTP 401). Verifica tu clave en OpenRouter.';
      } else if (response.status === 402) {
        errorMsg = 'Créditos insuficientes en tu cuenta de OpenRouter (HTTP 402).';
      }

      return {
        ok: false,
        latencyMs,
        models: isOR ? OPENROUTER_POPULAR_MODELS.map((m) => m.id) : [],
        error: errorMsg,
        isCorsOrOffline: false,
      };
    }

    const data = await response.json();
    let models = [];

    if (Array.isArray(data?.data)) {
      models = data.data.map((m) => (typeof m === 'string' ? m : m.id)).filter(Boolean);
    }

    // Ensure popular OpenRouter models are present at top
    if (isOR && models.length === 0) {
      models = OPENROUTER_POPULAR_MODELS.map((m) => m.id);
    }

    return {
      ok: true,
      latencyMs,
      models,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (err.name === 'AbortError') {
      return {
        ok: false,
        latencyMs,
        models: isOR ? OPENROUTER_POPULAR_MODELS.map((m) => m.id) : [],
        error: `Tiempo de espera agotado tras ${timeoutMs}ms. ¿Está el servidor accesible?`,
        isCorsOrOffline: true,
      };
    }

    const fallbackModels = isOR ? OPENROUTER_POPULAR_MODELS.map((m) => m.id) : [];

    return {
      ok: false,
      latencyMs,
      models: fallbackModels,
      error: isOR
        ? (err.message || 'Error al conectar con OpenRouter.')
        : (err.message || 'Fallo de conexión con LM Studio. Verifica que esté activo y con CORS habilitado.'),
      isCorsOrOffline: !isOR,
    };
  }
}

/**
 * Fetches the list of loaded/available models from the selected provider.
 * @param {object|string} settingsOrEndpoint 
 * @param {number} [timeoutMs=6000]
 * @returns {Promise<Array<string>>}
 */
export async function fetchAvailableModels(settingsOrEndpoint, timeoutMs = 6000) {
  const result = await checkConnection(settingsOrEndpoint, timeoutMs);
  if (result.ok) {
    return result.models;
  }
  if (result.models && result.models.length > 0) {
    return result.models;
  }
  throw new Error(result.error || 'Failed to fetch models');
}

/**
 * Sends a lightweight prompt to test chat completions inference.
 * @param {object} settings
 * @param {string} [testPrompt]
 * @param {number} [timeoutMs=20000]
 * @returns {Promise<{ ok: boolean, text?: string, latencyMs?: number, error?: string }>}
 */
export async function testInference(
  settings = {},
  testPrompt = 'Translate to Spanish: "Connection confirmed and inference is working properly!"',
  timeoutMs = 20000
) {
  const { baseUrl, headers, defaultModel } = getProviderConfig(settings);
  const url = `${baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = performance.now();

  const payload = {
    model: settings.selectedModel || defaultModel,
    messages: [
      {
        role: 'system',
        content: settings.systemPrompt || 'You are a helpful subtitle assistant.',
      },
      {
        role: 'user',
        content: testPrompt,
      },
    ],
    temperature: typeof settings.temperature === 'number' ? settings.temperature : 0.3,
    max_tokens: 120,
    stream: false,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMsg = `HTTP ${response.status}: ${errorText || response.statusText}`;

      if (response.status === 401) {
        errorMsg = 'API Key inválida o expirada (HTTP 401). Verifica tu clave en OpenRouter.';
      } else if (response.status === 402) {
        errorMsg = 'Saldo o créditos insuficientes en tu cuenta de OpenRouter (HTTP 402).';
      }

      return {
        ok: false,
        latencyMs,
        error: errorMsg,
      };
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || '(Empty response from model)';

    return {
      ok: true,
      text: reply,
      latencyMs,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (err.name === 'AbortError') {
      return {
        ok: false,
        latencyMs,
        error: `Inferencia excedió el tiempo límite de ${timeoutMs / 1000}s.`,
      };
    }
    return {
      ok: false,
      latencyMs,
      error: err.message || 'Error en la petición de inferencia.',
    };
  }
}
