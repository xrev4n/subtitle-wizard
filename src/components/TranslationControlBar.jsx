import { useTranslation } from '../context/I18nContext';
import { useSettings } from '../context/SettingsContext';
import { SUPPORTED_LANGUAGES } from '../services/translationService';
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  Languages,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function TranslationControlBar({
  queue,
  hasSubtitles = false,
}) {
  const { t } = useTranslation();
  const { serverStatus, setIsSettingsOpen } = useSettings();

  const {
    queueStatus,
    sourceLang,
    setSourceLang,
    targetLang,
    setTargetLang,
    errorCount,
    startTranslation,
    pauseTranslation,
    resumeTranslation,
    cancelTranslation,
    retryFailedCues,
  } = queue;

  const isServerReady = serverStatus === 'connected';

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
      {/* Offline server warning banner */}
      {!isServerReady && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{t('translation.controls.serverOffline')}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-colors flex-shrink-0 cursor-pointer"
          >
            {t('settings.title')}
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Title & Language selectors */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white m-0 p-0">
                {t('translation.panelTitle')}
              </h3>
              <p className="text-[11px] text-slate-400 m-0 p-0">
                {t('translation.panelSubtitle')}
              </p>
            </div>
          </div>

          {/* Language Pair Selector */}
          <div className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-white/10 w-full sm:w-auto justify-between sm:justify-start">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              disabled={queueStatus === 'translating'}
              className="px-2.5 py-1 text-xs bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={`src-${l.code}`} value={l.code} className="bg-slate-900 text-white">
                  {l.nativeName} ({l.code.toUpperCase()})
                </option>
              ))}
            </select>

            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              disabled={queueStatus === 'translating'}
              className="px-2.5 py-1 text-xs bg-transparent text-indigo-300 font-semibold focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={`tgt-${l.code}`} value={l.code} className="bg-slate-900 text-white">
                  {l.nativeName} ({l.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end flex-wrap">
          
          {/* Retry Failed button */}
          {errorCount > 0 && queueStatus !== 'translating' && (
            <button
              type="button"
              onClick={retryFailedCues}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {t('translation.controls.retryFailed')} ({errorCount})
              </span>
            </button>
          )}

          {/* Start button */}
          {(queueStatus === 'idle' || queueStatus === 'completed' || queueStatus === 'error') && (
            <button
              type="button"
              disabled={!hasSubtitles || !isServerReady}
              onClick={startTranslation}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>{t('translation.controls.start')}</span>
            </button>
          )}

          {/* Translating State: Pause & Cancel */}
          {queueStatus === 'translating' && (
            <>
              <button
                type="button"
                onClick={pauseTranslation}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>{t('translation.controls.pause')}</span>
              </button>
              <button
                type="button"
                onClick={cancelTranslation}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>{t('translation.controls.cancel')}</span>
              </button>
            </>
          )}

          {/* Paused State: Resume & Cancel */}
          {queueStatus === 'paused' && (
            <>
              <button
                type="button"
                onClick={resumeTranslation}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('translation.controls.resume')}</span>
              </button>
              <button
                type="button"
                onClick={cancelTranslation}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>{t('translation.controls.cancel')}</span>
              </button>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
