/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { checkConnection, testInference, OPENROUTER_POPULAR_MODELS } from '../services/llmService';

const SETTINGS_STORAGE_KEY = 'subtitle_wizard_settings';

export const DEFAULT_SYSTEM_PROMPT =
  'You are a professional subtitle translator. Translate the given subtitle lines accurately preserving nuance, timing tone, and formatting without omitting any block.';

export const DEFAULT_SETTINGS = {
  provider: 'lmstudio', // 'lmstudio' | 'openrouter'
  endpoint: 'http://localhost:1234/v1',
  openRouterKey: '',
  selectedModel: '',
  temperature: 0.3,
  maxTokens: 2048,
  batchSize: 10,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

export const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [serverStatus, setServerStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [latencyMs, setLatencyMs] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [connectionError, setConnectionError] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Update & persist settings
  const updateSettings = useCallback((newPartial) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist settings:', e);
      }
      return updated;
    });
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) {
      console.warn('Failed to reset settings:', e);
    }
  }, []);

  // Test connection to endpoint / provider
  const testServerConnection = useCallback(
    async (overrideSettings) => {
      const targetSettings = overrideSettings
        ? { ...settings, ...(typeof overrideSettings === 'object' ? overrideSettings : { endpoint: overrideSettings }) }
        : settings;

      setServerStatus('connecting');
      setConnectionError('');

      const result = await checkConnection(targetSettings, 6000);

      if (result.ok) {
        setServerStatus('connected');
        setLatencyMs(result.latencyMs);
        setAvailableModels(result.models);
        setConnectionError('');

        // Auto-select first model if none or previous not in list
        if (result.models && result.models.length > 0) {
          setSettings((prev) => {
            const hasModel = result.models.includes(prev.selectedModel);
            const modelToUse = hasModel
              ? prev.selectedModel
              : prev.provider === 'openrouter'
              ? 'deepseek/deepseek-chat'
              : result.models[0];
            const updated = { ...prev, selectedModel: modelToUse };
            try {
              localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
              console.warn(e);
            }
            return updated;
          });
        }
        return result;
      } else {
        setServerStatus('error');
        setLatencyMs(result.latencyMs);
        setConnectionError(result.error || 'Connection failed');
        if (result.models && result.models.length > 0) {
          setAvailableModels(result.models);
        }
        return result;
      }
    },
    [settings]
  );

  // Test inference
  const executeInferenceTest = useCallback(
    async (prompt) => {
      return await testInference(settings, prompt);
    },
    [settings]
  );

  // Check initial connection on mount or provider/endpoint change
  const { provider, endpoint, openRouterKey } = settings;

  useEffect(() => {
    let ignore = false;

    async function checkInitialServer() {
      const result = await checkConnection({ provider, endpoint, openRouterKey }, 6000);
      if (ignore) return;

      if (result.ok) {
        setServerStatus('connected');
        setLatencyMs(result.latencyMs);
        setAvailableModels(result.models);
        setConnectionError('');
        if (result.models && result.models.length > 0) {
          setSettings((prev) => {
            const hasModel = result.models.includes(prev.selectedModel);
            const defaultM = prev.provider === 'openrouter' ? 'deepseek/deepseek-chat' : result.models[0];
            const modelToUse = hasModel ? prev.selectedModel : defaultM;
            return { ...prev, selectedModel: modelToUse };
          });
        }
      } else {
        setServerStatus('error');
        setLatencyMs(result.latencyMs);
        setConnectionError(result.error || 'Connection failed');
        if (provider === 'openrouter') {
          setAvailableModels(OPENROUTER_POPULAR_MODELS.map((m) => m.id));
        }
      }
    }

    checkInitialServer();

    return () => {
      ignore = true;
    };
  }, [provider, endpoint, openRouterKey]);

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      resetSettings,
      serverStatus,
      latencyMs,
      availableModels,
      connectionError,
      testServerConnection,
      executeInferenceTest,
      isSettingsOpen,
      setIsSettingsOpen,
    }),
    [
      settings,
      updateSettings,
      resetSettings,
      serverStatus,
      latencyMs,
      availableModels,
      connectionError,
      testServerConnection,
      executeInferenceTest,
      isSettingsOpen,
      setIsSettingsOpen,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
