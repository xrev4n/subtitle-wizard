import { useTranslation } from '../context/I18nContext';
import { useSettings } from '../context/SettingsContext';
import {
  Wand2,
  ShieldCheck,
  Server,
  Globe,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Video,
  PlusCircle,
} from 'lucide-react';

export default function Header({
  onTogglePlayer,
  isPlayerActive = false,
  onNewProject,
}) {
  const { t, language, setLanguage } = useTranslation();
  const { serverStatus, latencyMs, settings, setIsSettingsOpen } = useSettings();

  const renderServerStatusBadge = () => {
    switch (serverStatus) {
      case 'connected':
        return (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs font-medium transition-all group cursor-pointer"
            title="Local LLM Server connected. Click to manage settings"
          >
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
            <span className="hidden sm:inline text-slate-300">LM Studio:</span>
            <span className="font-semibold text-emerald-300 font-mono">
              {latencyMs ? `${latencyMs}ms` : t('header.serverStatus.connected')}
            </span>
            {settings.selectedModel && (
              <span className="hidden xl:inline text-[10px] text-emerald-400/80 max-w-[120px] truncate border-l border-emerald-500/20 pl-2">
                {settings.selectedModel}
              </span>
            )}
          </button>
        );

      case 'connecting':
        return (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-xs font-medium transition-all cursor-pointer"
          >
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </div>
            <Server className="w-3.5 h-3.5 text-indigo-400 hidden sm:inline" />
            <span className="font-semibold text-indigo-300">Conectando...</span>
          </button>
        );

      case 'error':
        return (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-medium transition-all cursor-pointer"
            title="Local Server Offline or CORS error. Click to configure"
          >
            <div className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </div>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 hidden sm:inline" />
            <span className="hidden sm:inline text-slate-400">{t('header.serverStatus.label')}:</span>
            <span className="font-semibold text-rose-300">Offline / Error</span>
          </button>
        );

      case 'disconnected':
      default:
        return (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-xs font-medium transition-all cursor-pointer"
            title="Click to configure local LLM server"
          >
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </div>
            <Server className="w-3.5 h-3.5 text-amber-400 hidden sm:inline" />
            <span className="hidden sm:inline text-slate-400">{t('header.serverStatus.label')}:</span>
            <span className="font-semibold text-amber-300">{t('header.serverStatus.pending')}</span>
          </button>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Wand2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white m-0 p-0 leading-tight">
                  {t('header.title')}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v2.0 • 100% MVP
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block mt-0.5">
                {t('header.tagline')}
              </p>
            </div>
          </div>

          {/* Right Action & Status Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* New Project Button */}
            {onNewProject && (
              <button
                type="button"
                onClick={onNewProject}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                title="Limpiar todo e iniciar nuevo proyecto"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Nuevo</span>
              </button>
            )}

            {/* Media Player Toggle Button */}
            {onTogglePlayer && (
              <button
                type="button"
                onClick={onTogglePlayer}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  isPlayerActive
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                    : 'bg-slate-900/80 hover:bg-slate-800 border-white/10 text-slate-300 hover:text-white'
                }`}
                title="Mostrar/Ocultar Reproductor Multimedia"
              >
                <Video className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Reproductor</span>
              </button>
            )}

            {/* Privacy Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{t('common.badges.localOnly')}</span>
            </div>

            {/* Interactive Local Server Status Button */}
            {renderServerStatusBadge()}

            {/* Settings Gear Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Open LLM Server Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Language Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-white/10 shadow-inner">
              <div className="px-1.5 text-slate-500 hidden sm:flex items-center">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <button
                type="button"
                id="lang-es-btn"
                onClick={() => setLanguage('es')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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
