/**
 * Client-Side Project Session Storage Service
 * Automatically preserves current workspace state in localStorage.
 */

const SESSION_KEY = 'subtitle_wizard_project_session';

/**
 * Saves current working project to localStorage.
 * @param {object} data
 * @param {Array<object>} data.subtitles
 * @param {object} [data.currentFile]
 * @param {string} [data.sourceLang]
 * @param {string} [data.targetLang]
 */
export function saveProjectSession(data) {
  try {
    if (!data) return;
    const serialized = JSON.stringify({
      subtitles: data.subtitles || [],
      currentFile: data.currentFile || null,
      sourceLang: data.sourceLang || 'en',
      targetLang: data.targetLang || 'es',
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(SESSION_KEY, serialized);
  } catch (err) {
    console.warn('Unable to persist project session to localStorage:', err);
  }
}

/**
 * Loads saved project from localStorage.
 * @returns {object|null}
 */
export function loadProjectSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse saved project session:', err);
    return null;
  }
}

/**
 * Clears saved project session from localStorage.
 */
export function clearProjectSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.warn('Failed to clear session:', err);
  }
}
