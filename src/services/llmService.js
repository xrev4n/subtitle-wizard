/**
 * Local LLM Service (LM Studio / OpenAI-compatible API)
 * Zero external libraries, 100% in-browser native fetch with AbortController timeout.
 */

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
 * Validates connection to the local LLM server and measures round-trip latency.
 * @param {string} endpoint - e.g. "http://localhost:1234/v1"
 * @param {number} [timeoutMs=5000] - Request timeout in milliseconds
 * @returns {Promise<{
 *   ok: boolean,
 *   latencyMs: number,
 *   models: Array<string>,
 *   error?: string,
 *   isCorsOrOffline?: boolean
 * }>}
 */
export async function checkConnection(endpoint, timeoutMs = 5000) {
  const base = normalizeEndpoint(endpoint);
  const url = `${base}/models`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return {
        ok: false,
        latencyMs,
        models: [],
        error: `HTTP ${response.status}: ${response.statusText || 'Server responded with error'}`,
        isCorsOrOffline: false,
      };
    }

    const data = await response.json();
    const models = Array.isArray(data?.data)
      ? data.data.map((m) => (typeof m === 'string' ? m : m.id)).filter(Boolean)
      : [];

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
        models: [],
        error: `Connection timed out after ${timeoutMs}ms. Is the server running?`,
        isCorsOrOffline: true,
      };
    }

    return {
      ok: false,
      latencyMs,
      models: [],
      error: err.message || 'Failed to fetch. Server might be offline or CORS is not enabled in LM Studio.',
      isCorsOrOffline: true,
    };
  }
}

/**
 * Fetches the list of loaded/available models from the local server.
 * @param {string} endpoint 
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<Array<string>>}
 */
export async function fetchAvailableModels(endpoint, timeoutMs = 5000) {
  const result = await checkConnection(endpoint, timeoutMs);
  if (result.ok) {
    return result.models;
  }
  throw new Error(result.error || 'Failed to fetch models');
}

/**
 * Sends a lightweight prompt to test chat completions inference.
 * @param {object} config
 * @param {string} config.endpoint
 * @param {string} config.selectedModel
 * @param {number} [config.temperature=0.3]
 * @param {string} [config.systemPrompt]
 * @param {string} [testPrompt]
 * @param {number} [timeoutMs=15000]
 * @returns {Promise<{ ok: boolean, text?: string, latencyMs?: number, error?: string }>}
 */
export async function testInference(
  config,
  testPrompt = 'Respond with "Connection confirmed and inference is working properly!" in one sentence.',
  timeoutMs = 20000
) {
  const base = normalizeEndpoint(config.endpoint);
  const url = `${base}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = performance.now();

  const payload = {
    model: config.selectedModel || 'default',
    messages: [
      {
        role: 'system',
        content: config.systemPrompt || 'You are a helpful assistant.',
      },
      {
        role: 'user',
        content: testPrompt,
      },
    ],
    temperature: typeof config.temperature === 'number' ? config.temperature : 0.3,
    max_tokens: 120,
    stream: false,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        ok: false,
        error: `HTTP ${response.status}: ${errorText || response.statusText}`,
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
    if (err.name === 'AbortError') {
      return {
        ok: false,
        error: `Inference timed out after ${timeoutMs / 1000}s. Check if the model is loaded in LM Studio.`,
      };
    }
    return {
      ok: false,
      error: err.message || 'Inference request failed.',
    };
  }
}
