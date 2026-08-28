import { useState, useMemo } from 'react';
import { useTranslation } from '../context/I18nContext';
import { validateSubtitleIntegrity } from '../utils/timingUtils';
import {
  Search,
  Download,
  Clock,
  FileCode,
  Sparkles,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Plus,
  Scissors,
  Merge,
  Trash2,
  Undo2,
  AlertTriangle,
  SlidersHorizontal,
  Play,
} from 'lucide-react';

export default function SubtitlePreview({
  subtitles = [],
  onRetrySingleCue,
  onUpdateCue,
  onAddCueAfter,
  onSplitCue,
  onMergeWithNext,
  onDeleteCue,
  onOpenTimingModal,
  onOpenExportModal,
  onUndo,
  canUndo = false,
  activePlayingCueId = null,
  onSeekMedia,
}) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'translated' | 'pending' | 'translating' | 'error' | 'issues'
  const [selectedIds, setSelectedIds] = useState([]);

  // Compute integrity diagnostics
  const integrity = useMemo(() => {
    return validateSubtitleIntegrity(subtitles);
  }, [subtitles]);

  // Filter subtitles by search query and status tab
  const filteredSubtitles = useMemo(() => {
    return subtitles.filter((sub) => {
      // Filter by status tab
      if (statusFilter === 'issues') {
        if (!integrity.issuesByCueId[sub.id]) return false;
      } else if (statusFilter !== 'all' && sub.status !== statusFilter) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = String(sub.id).includes(q);
        const matchSource = sub.sourceText?.toLowerCase().includes(q);
        const matchTarget = sub.targetText?.toLowerCase().includes(q);
        return matchId || matchSource || matchTarget;
      }

      return true;
    });
  }, [subtitles, statusFilter, searchQuery, integrity.issuesByCueId]);

  const handleSelectAll = () => {
    if (selectedIds.length === subtitles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(subtitles.map((s) => s.id));
    }
  };

  const toggleSelectCue = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const renderStatusBadge = (sub) => {
    switch (sub.status) {
      case 'translating':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
            <span>{t('translation.cues.translatingStatus')}</span>
          </span>
        );
      case 'translated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{t('translation.cues.translatedStatus')}</span>
          </span>
        );
      case 'editing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <span>{t('common.status.editing')}</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>{t('translation.cues.errorStatus')}</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400 border border-white/5">
            {t('common.status.pending')}
          </span>
        );
    }
  };

  if (!subtitles || subtitles.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 border border-white/10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4">
          <FileCode className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">
          {t('parser.preview.noFileTitle')}
        </h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          {t('parser.preview.noFileDescription')}
        </p>
      </div>
    );
  }

  // Count by status
  const counts = {
    all: subtitles.length,
    translated: subtitles.filter((s) => s.status === 'translated').length,
    pending: subtitles.filter((s) => s.status === 'pending').length,
    translating: subtitles.filter((s) => s.status === 'translating').length,
    error: subtitles.filter((s) => s.status === 'error').length,
    issues: integrity.totalIssues,
  };

  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden space-y-0">
      
      {/* Top action header */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 m-0">
              <span>{t('editor.title')}</span>
              <span className="text-xs font-normal text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 font-mono">
                {filteredSubtitles.length} {t('parser.preview.of')} {subtitles.length}
              </span>
            </h2>
            {integrity.totalIssues > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>{integrity.totalIssues} avisos</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('parser.preview.subtitle')}
          </p>
        </div>

        {/* Toolbar action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          
          {/* Search filter */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('parser.preview.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Timing Shift Modal Button */}
          <button
            type="button"
            onClick={() => onOpenTimingModal && onOpenTimingModal(null, selectedIds)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('editor.tools')}</span>
          </button>

          {/* Undo Button */}
          {canUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              title={t('editor.undo')}
            >
              <Undo2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('editor.undo')}</span>
            </button>
          )}

          {/* Export Modal Trigger */}
          <button
            type="button"
            onClick={() => onOpenExportModal && onOpenExportModal()}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar...</span>
          </button>

        </div>
      </div>

      {/* Filter Tabs Row */}
      <div className="flex border-b border-white/10 px-4 sm:px-5 bg-slate-950/40 gap-2 overflow-x-auto items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{t('translation.filters.all')}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('translated')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              statusFilter === 'translated'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{t('translation.filters.translated')}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-300">
              {counts.translated}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              statusFilter === 'pending'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{t('translation.filters.pending')}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
              {counts.pending}
            </span>
          </button>

          {counts.error > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('error')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                statusFilter === 'error'
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{t('translation.filters.error')}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-300">
                {counts.error}
              </span>
            </button>
          )}

          {counts.issues > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('issues')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                statusFilter === 'issues'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <span>⚠️ Problemas</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                {counts.issues}
              </span>
            </button>
          )}
        </div>

        {/* Multi-select all */}
        <div className="flex items-center gap-2 pr-2">
          <label className="text-[11px] text-slate-400 flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.length === subtitles.length && subtitles.length > 0}
              onChange={handleSelectAll}
              className="accent-indigo-500"
            />
            <span>Seleccionar todos</span>
          </label>
        </div>
      </div>

      {/* Subtitles list with in-place editing and structural actions */}
      <div className="divide-y divide-white/5 max-h-[640px] overflow-y-auto">
        {filteredSubtitles.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            {t('parser.preview.noResults')}
          </div>
        ) : (
          filteredSubtitles.map((sub, idx) => {
            const durationSec = Math.max(0, (sub.endMs - sub.startMs) / 1000).toFixed(2);
            const cueIssues = integrity.issuesByCueId[sub.id] || [];
            const isSelected = selectedIds.includes(sub.id);
            const isCurrentlyPlaying = activePlayingCueId === sub.id;
            const hasNext = idx < subtitles.length - 1;

            return (
              <div
                key={sub.id}
                id={`cue-row-${sub.id}`}
                className={`p-4 sm:p-5 transition-all flex flex-col md:flex-row items-start gap-4 text-left ${
                  isCurrentlyPlaying
                    ? 'bg-indigo-950/40 border-l-4 border-indigo-400 shadow-inner'
                    : cueIssues.length > 0
                    ? 'bg-amber-950/10 border-l-4 border-amber-500'
                    : isSelected
                    ? 'bg-indigo-950/20'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* ID, Checkbox, Click-to-Seek Timing and Row Action Controls */}
                <div className="md:w-52 flex-shrink-0 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCue(sub.id)}
                        className="accent-indigo-500 cursor-pointer"
                      />
                      <span className="w-6 h-6 rounded-md bg-slate-800 border border-white/10 text-[11px] font-mono font-bold text-slate-300 flex items-center justify-center">
                        {sub.id}
                      </span>
                      {isCurrentlyPlaying && (
                        <span className="p-1 rounded bg-indigo-500 text-white animate-pulse">
                          <Play className="w-2.5 h-2.5 fill-current" />
                        </span>
                      )}
                    </div>
                    {renderStatusBadge(sub)}
                  </div>

                  {/* Click-to-Seek & Editable Timestamps Input Group */}
                  <div className="bg-slate-950 p-2 rounded-xl border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <input
                        type="text"
                        value={sub.startTime}
                        onChange={(e) => onUpdateCue(sub.id, { startTime: e.target.value })}
                        className="w-20 bg-slate-900 px-1.5 py-0.5 rounded border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                        title="Inicio HH:MM:SS,mmm"
                      />
                      <button
                        type="button"
                        onClick={() => onSeekMedia && onSeekMedia(sub.startMs)}
                        className="text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer"
                        title="Reproducir desde este instante"
                      >
                        →
                      </button>
                      <input
                        type="text"
                        value={sub.endTime}
                        onChange={(e) => onUpdateCue(sub.id, { endTime: e.target.value })}
                        className="w-20 bg-slate-900 px-1.5 py-0.5 rounded border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                        title="Fin HH:MM:SS,mmm"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                      <button
                        type="button"
                        onClick={() => onSeekMedia && onSeekMedia(sub.startMs)}
                        className="text-slate-400 hover:text-indigo-300 flex items-center gap-1 font-mono cursor-pointer"
                        title="Saltar video aquí"
                      >
                        <Play className="w-2.5 h-2.5" />
                        <span>{durationSec}s</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenTimingModal && onOpenTimingModal(sub.id)}
                        className="text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-1 cursor-pointer"
                        title="Desplazar tiempos desde este subtítulo"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Desplazar</span>
                      </button>
                    </div>
                  </div>

                  {/* Integrity Warning Alerts for this Cue */}
                  {cueIssues.length > 0 && (
                    <div className="space-y-1">
                      {cueIssues.map((issue, issueIdx) => (
                        <div
                          key={issueIdx}
                          className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[10px] leading-tight flex items-start gap-1"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Row Actions Toolbar */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onAddCueAfter(sub.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={t('editor.actions.addAfter')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSplitCue(sub.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={t('editor.actions.split')}
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>
                    {hasNext && (
                      <button
                        type="button"
                        onClick={() => onMergeWithNext(sub.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title={t('editor.actions.mergeNext')}
                      >
                        <Merge className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteCue(sub.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 transition-colors cursor-pointer"
                      title={t('editor.actions.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {sub.status === 'error' && onRetrySingleCue && (
                      <button
                        type="button"
                        onClick={() => onRetrySingleCue(sub.id)}
                        className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer ml-auto"
                        title={t('translation.cues.retryCue')}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtitle Cue Text (Dual Column: Editable Source vs Target) */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 w-full">
                  
                  {/* Source text in-place editable card */}
                  <div className="bg-slate-950/60 rounded-xl p-3.5 border border-white/5 flex flex-col justify-between focus-within:border-indigo-500/50 transition-colors">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                        <span>{t('parser.preview.sourceText')}</span>
                        <span className="text-[10px] text-slate-600 font-mono">Editable</span>
                      </div>
                      <textarea
                        rows={2}
                        value={sub.sourceText}
                        onChange={(e) => onUpdateCue(sub.id, { sourceText: e.target.value })}
                        placeholder={t('parser.preview.emptySource')}
                        className="w-full bg-transparent text-xs sm:text-sm text-slate-200 font-normal leading-relaxed resize-none focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Target text in-place editable card */}
                  <div
                    className={`rounded-xl p-3.5 border flex flex-col justify-between transition-all focus-within:border-indigo-500/70 ${
                      sub.status === 'translated'
                        ? 'bg-indigo-950/20 border-indigo-500/20'
                        : sub.status === 'translating'
                        ? 'bg-indigo-950/10 border-indigo-500/40 animate-pulse'
                        : sub.status === 'error'
                        ? 'bg-rose-950/20 border-rose-500/25'
                        : sub.status === 'editing'
                        ? 'bg-cyan-950/20 border-cyan-500/30'
                        : 'bg-slate-950/30 border-white/5 border-dashed'
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-indigo-400">
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>{t('parser.preview.targetText')}</span>
                        </span>
                        {sub.status === 'translating' ? (
                          <span className="text-[10px] text-indigo-300 font-mono">
                            Procesando...
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-mono">Editable</span>
                        )}
                      </div>

                      <textarea
                        rows={2}
                        value={sub.targetText || ''}
                        onChange={(e) =>
                          onUpdateCue(sub.id, {
                            targetText: e.target.value,
                            status: e.target.value.trim() ? 'translated' : 'pending',
                          })
                        }
                        placeholder={
                          sub.status === 'translating'
                            ? 'Esperando respuesta del LLM...'
                            : sub.status === 'error'
                            ? 'Error en traducción. Haz clic para escribir manualmente...'
                            : 'Traducción o texto destino...'
                        }
                        className="w-full bg-transparent text-xs sm:text-sm text-indigo-100 font-normal leading-relaxed resize-none focus:outline-none placeholder-slate-600"
                      />
                    </div>
                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
