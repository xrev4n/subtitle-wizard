/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

// Spanish locales
import esCommon from '../locales/es/common.json';
import esHeader from '../locales/es/header.json';
import esParser from '../locales/es/parser.json';
import esSettings from '../locales/es/settings.json';
import esTranslation from '../locales/es/translation.json';
import esEditor from '../locales/es/editor.json';
import esExport from '../locales/es/export.json';
import esPlayer from '../locales/es/player.json';

// English locales
import enCommon from '../locales/en/common.json';
import enHeader from '../locales/en/header.json';
import enParser from '../locales/en/parser.json';
import enSettings from '../locales/en/settings.json';
import enTranslation from '../locales/en/translation.json';
import enEditor from '../locales/en/editor.json';
import enExport from '../locales/en/export.json';
import enPlayer from '../locales/en/player.json';

const translations = {
  es: {
    common: esCommon,
    header: esHeader,
    parser: esParser,
    settings: esSettings,
    translation: esTranslation,
    editor: esEditor,
    export: esExport,
    player: esPlayer,
  },
  en: {
    common: enCommon,
    header: enHeader,
    parser: enParser,
    settings: enSettings,
    translation: enTranslation,
    editor: enEditor,
    export: enExport,
    player: enPlayer,
  },
};

const STORAGE_KEY = 'subtitle_wizard_lang';
const DEFAULT_LANG = 'es';

export const I18nContext = createContext(null);

/**
 * Helper to resolve nested object path such as "header.title" or "common.actions.upload"
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'es' || saved === 'en')) {
        return saved;
      }
      // Detect browser language
      const browserLang = navigator.language?.slice(0, 2).toLowerCase();
      return browserLang === 'es' ? 'es' : 'en';
    } catch {
      return DEFAULT_LANG;
    }
  });

  const setLanguage = useCallback((newLang) => {
    if (newLang !== 'es' && newLang !== 'en') return;
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch (e) {
      console.warn('Unable to persist language to localStorage:', e);
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  /**
   * Translate function
   * @param {string} key - e.g. "header.title" or "common.actions.upload"
   * @param {Record<string, any>} [params] - optional interpolation params
   * @returns {string}
   */
  const t = useCallback(
    (key, params = {}) => {
      const currentDictionary = translations[language] || translations[DEFAULT_LANG];
      let value = getNestedValue(currentDictionary, key);

      // Fallback to Spanish or English if key not found
      if (value === undefined) {
        const fallbackDictionary = translations[DEFAULT_LANG];
        value = getNestedValue(fallbackDictionary, key);
      }

      // If still not found, return key
      if (value === undefined) {
        return key;
      }

      if (typeof value !== 'string') {
        return value;
      }

      // Interpolate {paramName}
      if (params && Object.keys(params).length > 0) {
        return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
          return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        }, value);
      }

      return value;
    },
    [language]
  );

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      languages: [
        { code: 'es', label: 'Español' },
        { code: 'en', label: 'English' },
      ],
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
