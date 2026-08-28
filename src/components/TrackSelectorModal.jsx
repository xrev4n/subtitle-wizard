import { useState } from 'react';
import { useTranslation } from '../context/I18nContext';
import { extractTrackAsSRT } from '../services/mediaExtractorService';
import {
  X,
  FileText,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Video,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function TrackSelectorModal({
  isOpen,
  onClose,
  tracks = [],
  mediaFile = null,
  onTrackSelected,
  onSkip,
}) {
  const { t } = useTranslation();
  const defaultSelectedId = tracks.find((tr) => !tr.isBitmap)?.id ?? tracks[0]?.id ?? null;
  const [selectedTrackId, setSelectedTrackId] = useState(defaultSelectedId);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const selectedTrack = tracks.find((tr) => tr.id === selectedTrackId);
  const isSelectedBitmap = selectedTrack?.isBitmap;

  const handleExtract = async () => {
    if (!selectedTrack || isSelectedBitmap || !mediaFile) return;

    setIsExtracting(true);
    setErrorMessage('');

    try {
      const srtContent = await extractTrackAsSRT(mediaFile, selectedTrack);
      if (!srtContent || srtContent.trim().length === 0) {
        throw new Error('No subtitle cues extracted');
      }

      onTrackSelected({
        track: selectedTrack,
        rawContent: srtContent,
        mediaFile,
      });
      setIsExtracting(false);
    } catch (err) {
      console.error('[TrackSelectorModal] Extraction error:', err);
      setErrorMessage(
        t('extractor.alerts.extractFailed', { error: err.message || 'Demuxing failed' })
      );
      setIsExtracting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white m-0 p-0 leading-tight">
                {t('extractor.title')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 m-0 p-0">
                {mediaFile ? mediaFile.name : t('extractor.subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-left">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              {t('extractor.trackList', { count: tracks.length })}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Video className="w-3.5 h-3.5 text-indigo-400" />
              <span>{mediaFile?.name}</span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Track Cards */}
          <div className="space-y-2.5">
            {tracks.map((track) => {
              const isSelected = track.id === selectedTrackId;
              const isBitmap = track.isBitmap;

              return (
                <div
                  key={track.id}
                  onClick={() => !isBitmap && setSelectedTrackId(track.id)}
                  className={`p-3.5 rounded-2xl border transition-all text-left flex items-start justify-between gap-3 ${
                    isBitmap
                      ? 'bg-slate-950/40 border-white/5 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/50 cursor-pointer'
                      : 'bg-slate-950/70 border-white/10 hover:border-white/20 hover:bg-slate-950 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 ${
                        isBitmap
                          ? 'border-slate-700 bg-slate-800 text-slate-600'
                          : isSelected
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : 'border-white/20 bg-slate-900'
                      }`}
                    >
                      {isSelected && !isBitmap && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">
                          {track.title || `${t('extractor.trackItem.track')} #${track.id}`}
                        </span>

                        {/* Language Badge */}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                          {track.language || 'UND'}
                        </span>

                        {/* Format Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${
                            isBitmap
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          }`}
                        >
                          {track.format}
                        </span>
                      </div>

                      {/* Codec & Details */}
                      <p className="text-[11px] text-slate-400 font-mono">
                        Codec: {track.codecId || track.format}
                      </p>

                      {/* Bitmap warning */}
                      {isBitmap && (
                        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-300/90 font-sans">
                          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{t('extractor.trackItem.bitmapWarning')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors cursor-pointer"
          >
            {t('extractor.actions.skipAndUseVideo')}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors cursor-pointer"
            >
              {t('extractor.actions.cancel')}
            </button>

            <button
              type="button"
              disabled={isExtracting || !selectedTrack || isSelectedBitmap}
              onClick={handleExtract}
              className="w-full sm:w-auto px-4.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('extractor.extracting')}</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>{t('extractor.actions.extractAndLoad')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
