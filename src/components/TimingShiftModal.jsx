import { useState, useEffect } from 'react';
import { useTranslation } from '../context/I18nContext';
import { msToTime } from '../utils/srtParser';
import {
  X,
  Clock,
  FastForward,
  Rewind,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function TimingShiftModal({
  isOpen,
  onClose,
  subtitles = [],
  onApplyShift,
  initialCueId = null,
  selectedIds = [],
}) {
  const { t } = useTranslation();
  const [offsetMs, setOffsetMs] = useState(500);
  const [scope, setScope] = useState(() => {
    if (initialCueId) return 'fromSelected';
    if (selectedIds && selectedIds.length > 0) return 'selectedOnly';
    return 'all';
  });
  const [fromId, setFromId] = useState(() => initialCueId || 1);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !subtitles || subtitles.length === 0) return null;

  const presets = [-5000, -1000, -500, -100, 100, 500, 1000, 5000];

  const formatOffsetLabel = (ms) => {
    const sign = ms > 0 ? '+' : '';
    if (Math.abs(ms) >= 1000) {
      return `${sign}${(ms / 1000).toFixed(1)}s`;
    }
    return `${sign}${ms}ms`;
  };

  // Compute affected count and preview
  let affectedCues = [];
  if (scope === 'all') {
    affectedCues = subtitles;
  } else if (scope === 'fromSelected') {
    affectedCues = subtitles.filter((s) => s.id >= fromId);
  } else if (scope === 'selectedOnly') {
    const selSet = new Set(selectedIds);
    affectedCues = subtitles.filter((s) => selSet.has(s.id));
  }

  const firstAffected = affectedCues[0];
  const lastAffected = affectedCues[affectedCues.length - 1];

  const previewStart = firstAffected
    ? msToTime(Math.max(0, firstAffected.startMs + offsetMs))
    : '00:00:00,000';
  const previewEnd = lastAffected
    ? msToTime(Math.max(0, lastAffected.endMs + offsetMs))
    : '00:00:00,000';

  const handleApply = () => {
    onApplyShift(offsetMs, {
      targetRange: scope,
      fromId: scope === 'fromSelected' ? fromId : undefined,
      selectedIds: scope === 'selectedOnly' ? selectedIds : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white m-0 p-0 leading-tight">
                {t('editor.shiftModal.title')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 m-0 p-0">
                {t('editor.shiftModal.subtitle')}
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

        {/* Body */}
        <div className="p-6 space-y-5 text-left overflow-y-auto max-h-[75vh]">
          
          {/* Offset Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              {t('editor.shiftModal.offsetLabel')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOffsetMs((prev) => prev - 500)}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Rewind className="w-3.5 h-3.5" />
                <span>-500ms</span>
              </button>

              <input
                type="number"
                step="50"
                value={offsetMs}
                onChange={(e) => setOffsetMs(parseInt(e.target.value, 10) || 0)}
                placeholder={t('editor.shiftModal.offsetPlaceholder')}
                className="flex-1 px-3.5 py-2 text-base font-bold text-center bg-slate-950 border border-white/10 rounded-xl text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
              />

              <button
                type="button"
                onClick={() => setOffsetMs((prev) => prev + 500)}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>+500ms</span>
                <FastForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-medium">
              {t('editor.shiftModal.presets')}
            </span>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setOffsetMs(preset)}
                  className={`py-1.5 px-2 text-xs font-mono font-semibold rounded-lg border transition-all cursor-pointer ${
                    offsetMs === preset
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/50'
                      : 'bg-slate-950/70 text-slate-300 border-white/10 hover:bg-slate-800'
                  }`}
                >
                  {formatOffsetLabel(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Scope Selector */}
          <div className="space-y-2.5 pt-2">
            <label className="text-xs font-semibold text-slate-300">
              {t('editor.shiftModal.scopeLabel')}
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/10 hover:border-white/20 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="shiftScope"
                  value="all"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="accent-indigo-500"
                />
                <div className="text-xs text-slate-200">
                  {t('editor.shiftModal.scopes.all', { count: subtitles.length })}
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/10 hover:border-white/20 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="shiftScope"
                  value="fromSelected"
                  checked={scope === 'fromSelected'}
                  onChange={() => setScope('fromSelected')}
                  className="accent-indigo-500"
                />
                <div className="flex-1 flex items-center justify-between text-xs text-slate-200">
                  <span>
                    {t('editor.shiftModal.scopes.fromSelected', {
                      id: fromId,
                      count: subtitles.filter((s) => s.id >= fromId).length,
                    })}
                  </span>
                  <select
                    value={fromId}
                    onChange={(e) => setFromId(parseInt(e.target.value, 10))}
                    disabled={scope !== 'fromSelected'}
                    className="px-2 py-0.5 text-xs bg-slate-900 border border-white/10 rounded-lg text-white font-mono"
                  >
                    {subtitles.map((s) => (
                      <option key={s.id} value={s.id}>
                        #{s.id} ({s.startTime})
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              {selectedIds.length > 0 && (
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/10 hover:border-white/20 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="shiftScope"
                    value="selectedOnly"
                    checked={scope === 'selectedOnly'}
                    onChange={() => setScope('selectedOnly')}
                    className="accent-indigo-500"
                  />
                  <div className="text-xs text-slate-200">
                    {t('editor.shiftModal.scopes.selectedOnly', { count: selectedIds.length })}
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Impact Preview Box */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                {t('editor.shiftModal.previewTitle')}
              </span>
              <span className="text-[11px] font-semibold text-indigo-200">
                {t('editor.shiftModal.affectedCues', { count: affectedCues.length })}
              </span>
            </div>

            {affectedCues.length > 0 && (
              <div className="text-xs text-slate-300 font-mono flex items-center justify-between pt-1">
                <span>{t('editor.shiftModal.timeRange')}</span>
                <span className="text-white font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-white/10">
                  {previewStart} → {previewEnd}
                </span>
              </div>
            )}

            <p className="text-[10px] text-slate-400 pt-1 m-0">
              {t('editor.shiftModal.clampingNotice')}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors cursor-pointer"
          >
            {t('editor.shiftModal.close')}
          </button>

          <button
            type="button"
            disabled={affectedCues.length === 0}
            onClick={handleApply}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-md shadow-indigo-600/30 disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('editor.shiftModal.applyBtn')}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
