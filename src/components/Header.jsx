import { useTranslation } from '../context/I18nContext';
import { useSettings } from '../context/SettingsContext';
import swLogo from '../assets/logo/sw-logo.png';
import {
  Server,
  Globe,
  CheckCircle2,
  PlusCircle,
  Trash2,
  Cloud,
} from 'lucide-react';

export default function Header({ onNewProject, onClearAll, hasActiveProject = false }) {
  const { t, language, setLanguage } = useTranslation();
  const { serverStatus, latencyMs, settings, setIsSettingsOpen } = useSettings();

  const isOR = settings.provider === 'openrouter';
  const providerLabel = isOR ? t('header.serverStatus.openrouter') : t('header.serverStatus.lmstudio');

  const renderServerStatusBadge = () => {
    switch (serverStatus) {
      case 'connected':
        return (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs font-medium transition-all group cursor-pointer"
            title={`${providerLabel} conectado. Clic para ajustar configuración`}
          >
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            {isOR ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
            )}
            <span className="hidden sm:inline text-slate-300">{providerLabel}:</span>
            <span className="font-semibold text-emerald-300 font-mono text-[11px]">
              {latencyMs ? `${latencyMs}ms` : t('header.serverStatus.connected')}
            </span>
            {settings.selectedModel && (
              <span className="hidden xl:inline text-[10px] text-emerald-400/80 max-w-[120px] truncate border-l border-emerald-500/20 pl-2">
                {settings.selectedModel.split('/').pop()}
              </span>
            )}
          </button>
        );

      case 'connecting':
        return (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-xs font-medium transition-all cursor-pointer"
            title="Conectando..."
          >
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </div>
            {isOR ? (
              <Cloud className="w-3.5 h-3.5 text-indigo-400 hidden sm:inline" />
            ) : (
              <Server className="w-3.5 h-3.5 text-indigo-400 hidden sm:inline" />
            )}
            <span className="font-semibold text-indigo-300 text-[11px]">Conectando...</span>
          </button>
        );

      case 'error':
      case 'disconnected':
      default:
        return (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all group cursor-pointer"
            title={t('header.serverStatus.configurePrompt')}
          >
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </div>
            {isOR ? (
              <Cloud className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Server className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="font-semibold text-amber-300 text-[11px]">
              {t('header.serverStatus.configurePrompt')}
            </span>
          </button>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <img
              src={swLogo}
              alt="Subtitle Wizard Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain select-none"
            />
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white m-0 p-0 leading-tight">
              Subtitle Wizard
            </h1>
          </div>

          {/* Right Action & Status Badges */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Interactive Local Server / OpenRouter Status Button */}
            {renderServerStatusBadge()}

            {/* Project Actions: New & Clear All */}
            {hasActiveProject && (
              <div className="flex items-center gap-1.5">
                {onNewProject && (
                  <button
                    type="button"
                    onClick={onNewProject}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                    title="Iniciar nuevo proyecto"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden md:inline">{t('header.actions.newProject')}</span>
                  </button>
                )}

                {onClearAll && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-medium transition-colors cursor-pointer"
                    title="Borrar todos los datos de memoria"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden md:inline">{t('header.actions.clearAll')}</span>
                  </button>
                )}
              </div>
            )}

            {/* Language Switcher */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-900/80 border border-white/10 shadow-inner">
              <div className="px-1 text-slate-500 hidden sm:flex items-center">
                <Globe className="w-3 h-3" />
              </div>
              <button
                type="button"
                id="lang-es-btn"
                onClick={() => setLanguage('es')}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  language === 'es'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
                title="Cambiar a Español"
              >
                ES
              </button>
              <button
                type="button"
                id="lang-en-btn"
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
                title="Switch to English"
              >
                EN
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
