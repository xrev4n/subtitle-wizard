/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { checkConnection, testInference } from '../services/llmService';

const SETTINGS_STORAGE_KEY = 'subtitle_wizard_settings';

export const DEFAULT_SYSTEM_PROMPT =
  'You are a professional subtitle translator. Translate the given subtitle lines accurately preserving nuance, timing tone, and formatting without omitting any block.';

export const DEFAULT_SETTINGS = {
  endpoint: 'http://localhost:1234/v1',
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

  // Test connection to endpoint
  const testServerConnection = useCallback(
    async (overrideEndpoint) => {
      const targetEndpoint = overrideEndpoint || settings.endpoint;
      setServerStatus('connecting');
      setConnectionError('');

      const result = await checkConnection(targetEndpoint, 6000);

      if (result.ok) {
        setServerStatus('connected');
        setLatencyMs(result.latencyMs);
        setAvailableModels(result.models);
        setConnectionError('');

        // Auto-select first model if none or previous not in list
        if (result.models.length > 0) {
          setSettings((prev) => {
            const hasModel = result.models.includes(prev.selectedModel);
            const modelToUse = hasModel ? prev.selectedModel : result.models[0];
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
        return result;
      }
    },
    [settings.endpoint]
  );

  // Test inference
  const executeInferenceTest = useCallback(
    async (prompt) => {
      return await testInference(settings, prompt);
    },
    [settings]
  );

  // Check initial connection on mount using async lifecycle
  useEffect(() => {
    let ignore = false;

    async function checkInitialServer() {
      const result = await checkConnection(settings.endpoint, 6000);
      if (ignore) return;

      if (result.ok) {
        setServerStatus('connected');
        setLatencyMs(result.latencyMs);
        setAvailableModels(result.models);
        setConnectionError('');
        if (result.models.length > 0) {
          setSettings((prev) => {
            const hasModel = result.models.includes(prev.selectedModel);
            const modelToUse = hasModel ? prev.selectedModel : result.models[0];
            return { ...prev, selectedModel: modelToUse };
          });
        }
      } else {
        setServerStatus('error');
        setLatencyMs(result.latencyMs);
        setConnectionError(result.error || 'Connection failed');
      }
    }

    checkInitialServer();

    return () => {
      ignore = true;
    };
  }, [settings.endpoint]);

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
