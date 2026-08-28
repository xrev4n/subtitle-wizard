import { useState, useEffect } from 'react';
import { useTranslation } from '../context/I18nContext';
import { useSettings, DEFAULT_SETTINGS, DEFAULT_SYSTEM_PROMPT } from '../context/SettingsContext';
import { OPENROUTER_POPULAR_MODELS } from '../services/llmService';
import {
  X,
  Server,
  Sliders,
  FileCode,
  Activity,
  RefreshCw,
  Play,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Zap,
  Cloud,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export default function SettingsModal() {
  const { t } = useTranslation();
  const {
    settings,
    updateSettings,
    serverStatus,
    latencyMs,
    availableModels,
    connectionError,
    testServerConnection,
    executeInferenceTest,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useSettings();

  const [activeTab, setActiveTab] = useState('connection'); // 'connection' | 'parameters' | 'prompt'
  const [provider, setProvider] = useState(settings.provider || 'lmstudio');
  const [localEndpoint, setLocalEndpoint] = useState(settings.endpoint || 'http://localhost:1234/v1');
  const [openRouterKey, setOpenRouterKey] = useState(settings.openRouterKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(settings.selectedModel || '');
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [isTestingInference, setIsTestingInference] = useState(false);
  const [inferenceResult, setInferenceResult] = useState(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, setIsSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleProviderSwitch = (newProvider) => {
    setProvider(newProvider);
    let newModel = selectedModel;
    if (newProvider === 'openrouter' && (!newModel || !newModel.includes('/'))) {
      newModel = 'deepseek/deepseek-chat';
      setSelectedModel(newModel);
    }
    updateSettings({
      provider: newProvider,
      selectedModel: newModel,
    });
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    const updated = {
      provider,
      endpoint: localEndpoint,
      openRouterKey,
      selectedModel,
    };
    updateSettings(updated);
    await testServerConnection(updated);
    setIsTestingConn(false);
  };

  const handleTestInference = async () => {
    setIsTestingInference(true);
    setInferenceResult(null);
    const updated = {
      provider,
      endpoint: localEndpoint,
      openRouterKey,
      selectedModel,
    };
    updateSettings(updated);
    const res = await executeInferenceTest(
      'Translate to Spanish: "Hello, welcome to Subtitle Wizard. Enjoy fast in-browser translation!"'
    );
    setInferenceResult(res);
    setIsTestingInference(false);
  };

  const handleSelectPopularModel = (modelId) => {
    setSelectedModel(modelId);
    updateSettings({ selectedModel: modelId });
  };

  const handleResetParams = () => {
    updateSettings({
      temperature: DEFAULT_SETTINGS.temperature,
      batchSize: DEFAULT_SETTINGS.batchSize,
      maxTokens: DEFAULT_SETTINGS.maxTokens,
    });
  };

  const handleResetPrompt = () => {
    updateSettings({
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    });
  };

  const handleSave = () => {
    updateSettings({
      provider,
      endpoint: localEndpoint,
      openRouterKey,
      selectedModel,
    });
    setIsSettingsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              {provider === 'openrouter' ? <Cloud className="w-5 h-5" /> : <Server className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white m-0 p-0 leading-tight">
                {t('settings.title')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 m-0 p-0">
                {t('settings.subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-6 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('connection')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'connection'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{t('settings.tabs.connection')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('parameters')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'parameters'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{t('settings.tabs.parameters')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'prompt'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{t('settings.tabs.prompt')}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
          
          {/* TAB 1: CONNECTION, PROVIDER & MODEL */}
          {activeTab === 'connection' && (
            <div className="space-y-6">
              
              {/* Provider Selection Segmented Switch */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  {t('settings.provider.label')}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  
                  {/* Option A: LM Studio */}
                  <button
                    type="button"
                    onClick={() => handleProviderSwitch('lmstudio')}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                      provider === 'lmstudio'
                        ? 'bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:bg-slate-950 hover:text-slate-200'
                    }`}
                  >
                    <div className={`p-2 rounded-xl border ${provider === 'lmstudio' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-900 text-slate-400 border-white/10'}`}>
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{t('settings.provider.lmstudio')}</span>
                        {provider === 'lmstudio' && <span className="w-2 h-2 rounded-full bg-indigo-400"></span>}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                        {t('settings.provider.lmstudioDesc')}
                      </p>
                    </div>
                  </button>

                  {/* Option B: OpenRouter */}
                  <button
                    type="button"
                    onClick={() => handleProviderSwitch('openrouter')}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                      provider === 'openrouter'
                        ? 'bg-purple-600/15 border-purple-500 text-white ring-1 ring-purple-500/50'
                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:bg-slate-950 hover:text-slate-200'
                    }`}
                  >
                    <div className={`p-2 rounded-xl border ${provider === 'openrouter' ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-900 text-slate-400 border-white/10'}`}>
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{t('settings.provider.openrouter')}</span>
                        {provider === 'openrouter' && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                        {t('settings.provider.openrouterDesc')}
                      </p>
                    </div>
                  </button>

                </div>
              </div>

              {/* LM Studio Specific Settings */}
              {provider === 'lmstudio' && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      {t('settings.connection.endpointLabel')}
                    </label>
                    {serverStatus === 'connected' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('settings.connection.connected')} ({latencyMs}ms)
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={localEndpoint}
                      onChange={(e) => setLocalEndpoint(e.target.value)}
                      placeholder={t('settings.connection.endpointPlaceholder')}
                      className="flex-1 px-3.5 py-2 text-sm bg-slate-900 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      disabled={isTestingConn}
                      onClick={handleTestConnection}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin' : ''}`} />
                      <span>{isTestingConn ? t('settings.connection.testing') : t('settings.connection.testBtn')}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {t('settings.connection.endpointHelp')}
                  </p>

                  {/* CORS Warning Box */}
                  {serverStatus === 'error' && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-semibold text-amber-300">
                        <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{t('settings.connection.corsWarningTitle')}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        {t('settings.connection.corsWarningText')}
                      </p>
                      {connectionError && (
                        <div className="p-2 bg-slate-950/70 rounded text-rose-300 font-mono text-[10px] border border-rose-500/20">
                          {connectionError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* OpenRouter Specific Settings */}
              {provider === 'openrouter' && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-purple-200 flex items-center gap-1.5">
                      <span>{t('settings.openrouter.apiKeyLabel')}</span>
                    </label>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <span>{t('settings.openrouter.getKeyLink')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={openRouterKey}
                        onChange={(e) => setOpenRouterKey(e.target.value)}
                        placeholder={t('settings.openrouter.apiKeyPlaceholder')}
                        className="w-full px-3.5 py-2 pr-10 text-sm bg-slate-900 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
                        title={showApiKey ? 'Ocultar clave' : 'Mostrar clave'}
                      >
                        {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isTestingConn || !openRouterKey.trim()}
                      onClick={handleTestConnection}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin' : ''}`} />
                      <span>{isTestingConn ? t('settings.connection.testing') : t('settings.connection.testBtn')}</span>
                    </button>
                  </div>

                  {/* BYOK Privacy notice */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>{t('settings.openrouter.apiKeyHelp')}</span>
                  </div>

                  {/* Popular Model Presets Pills */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-semibold text-slate-400">
                      {t('settings.openrouter.popularModels')}:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {OPENROUTER_POPULAR_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectPopularModel(m.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                            selectedModel === m.id
                              ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                              : 'bg-slate-900 text-slate-300 border-white/10 hover:border-purple-400/50 hover:bg-slate-800'
                          }`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Model Dropdown & Custom Model Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    {t('settings.connection.modelLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{t('settings.connection.refreshModels')}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      updateSettings({ selectedModel: e.target.value });
                    }}
                    placeholder={provider === 'openrouter' ? t('settings.openrouter.customModelPlaceholder') : t('settings.connection.modelPlaceholder')}
                    className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                  />

                  {availableModels.length > 0 && (
                    <select
                      value={selectedModel}
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                        updateSettings({ selectedModel: e.target.value });
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-950/80 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors font-mono cursor-pointer"
                    >
                      <option value="">-- Seleccionar de la lista ({availableModels.length} disponibles) --</option>
                      {availableModels.map((modelId) => (
                        <option key={modelId} value={modelId} className="bg-slate-900 text-white">
                          {modelId}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Diagnostic Test Inference Section */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-white">Prueba de Inferencia Diagnóstica</span>
                  </div>
                  <button
                    type="button"
                    disabled={isTestingInference || (provider === 'openrouter' && !openRouterKey.trim())}
                    onClick={handleTestInference}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-indigo-400" />
                    {isTestingInference
                      ? t('settings.connection.testingInference')
                      : t('settings.connection.testInferenceBtn')}
                  </button>
                </div>

                {inferenceResult && (
                  <div className="mt-2 text-xs space-y-1 animate-fadeIn">
                    {inferenceResult.ok ? (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                        <div className="flex items-center justify-between font-semibold text-emerald-300 mb-1">
                          <span>{t('settings.connection.testInferenceSuccess')}</span>
                          <span className="font-mono text-[10px]">{inferenceResult.latencyMs}ms</span>
                        </div>
                        <p className="font-sans text-slate-200 text-xs italic m-0">
                          "{inferenceResult.text}"
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                        <span className="font-semibold">{t('settings.connection.testInferenceFailed')}:</span>{' '}
                        {inferenceResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: INFERENCE PARAMETERS */}
          {activeTab === 'parameters' && (
            <div className="space-y-6">
              
              {/* Temperature Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    {t('settings.parameters.temperatureLabel')}
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {settings.temperature.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  {t('settings.parameters.temperatureHelp')}
                </p>
              </div>

              {/* Batch Size Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    {t('settings.parameters.batchSizeLabel')}
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {settings.batchSize} {t('parser.preview.blocks')}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={settings.batchSize}
                  onChange={(e) => updateSettings({ batchSize: parseInt(e.target.value, 10) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  {t('settings.parameters.batchSizeHelp')}
                </p>
              </div>

              {/* Max Tokens Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    {t('settings.parameters.maxTokensLabel')}
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {settings.maxTokens}
                  </span>
                </div>
                <input
                  type="number"
                  min="256"
                  max="8192"
                  step="128"
                  value={settings.maxTokens}
                  onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value, 10) || 2048 })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400">
                  {t('settings.parameters.maxTokensHelp')}
                </p>
              </div>

              {/* Reset to defaults button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetParams}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('settings.parameters.resetDefaults')}</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: SYSTEM PROMPT */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t('settings.prompt.systemPromptLabel')}
                </label>
                <p className="text-[11px] text-slate-400">
                  {t('settings.prompt.systemPromptHelp')}
                </p>
              </div>

              <textarea
                rows={6}
                value={settings.systemPrompt}
                onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
                className="w-full p-3.5 text-xs bg-slate-950 border border-white/10 rounded-2xl text-slate-200 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed resize-y"
              />

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleResetPrompt}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('settings.prompt.resetPromptBtn')}</span>
                </button>

                <div className="flex items-center gap-1.5 text-[11px] text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>LLM In-Memory Context</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950 flex items-center justify-end">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors cursor-pointer"
            >
              {t('settings.actions.close')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {t('settings.actions.save')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
