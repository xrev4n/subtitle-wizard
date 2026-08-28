import { useTranslation } from '../context/I18nContext';
import { formatDuration } from '../utils/srtParser';
import { Activity, Clock, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function TranslationProgressBar({ queue }) {
  const { t } = useTranslation();

  const {
    queueStatus,
    progressPercent,
    currentBatchIndex,
    totalBatches,
    translatedCount,
    totalCues,
    speed,
    etaSeconds,
    errorCount,
  } = queue;

  if (queueStatus === 'idle' && translatedCount === 0) {
    return null;
  }

  const formattedEta = etaSeconds > 0 ? formatDuration(etaSeconds * 1000) : '00:00';

  const getStatusLabel = () => {
    switch (queueStatus) {
      case 'translating':
        return t('translation.progress.status.translating');
      case 'paused':
        return t('translation.progress.status.paused');
      case 'completed':
        return t('translation.progress.status.completed');
      case 'error':
        return t('translation.progress.status.error');
      default:
        return t('translation.progress.status.idle');
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3.5 animate-fadeIn">
      
      {/* Top summary row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {queueStatus === 'translating' && (
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
          )}
          {queueStatus === 'completed' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-xs font-bold text-white">
            {getStatusLabel()}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {translatedCount}/{totalCues} ({progressPercent}%)
          </span>
        </div>

        {/* Telemetry badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {totalBatches > 0 && queueStatus === 'translating' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-white/10">
              <Activity className="w-3 h-3 text-indigo-400" />
              {t('translation.progress.batch', {
                current: currentBatchIndex,
                total: totalBatches,
              })}
            </span>
          )}

          {speed > 0 && queueStatus === 'translating' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Zap className="w-3 h-3 text-amber-400" />
              {t('translation.progress.speed', { speed })}
            </span>
          )}

          {etaSeconds > 0 && queueStatus === 'translating' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Clock className="w-3 h-3 text-cyan-400" />
              {t('translation.progress.eta', { eta: formattedEta })}
            </span>
          )}

          {errorCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              {t('translation.progress.errorsCount', { count: errorCount })}
            </span>
          )}
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="w-full bg-slate-950/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
        <div
          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-sm shadow-indigo-500/50"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

    </div>
  );
}
