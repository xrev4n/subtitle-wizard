import { useState, useCallback, useEffect } from 'react';
import { I18nProvider } from './context/I18nContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { useTranslationQueue } from './hooks/useTranslationQueue';
import {
  shiftTimestamps,
  splitCueInList,
  mergeWithNextCue,
  insertCueAfter,
  removeCue,
  updateCueInList,
} from './utils/timingUtils';
import {
  saveProjectSession,
  loadProjectSession,
  clearProjectSession,
} from './services/storageService';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
import StatsBar from './components/StatsBar';
import TranslationControlBar from './components/TranslationControlBar';
import TranslationProgressBar from './components/TranslationProgressBar';
import SubtitlePreview from './components/SubtitlePreview';
import MediaSyncPlayer from './components/MediaSyncPlayer';
import SettingsModal from './components/SettingsModal';
import TimingShiftModal from './components/TimingShiftModal';
import ExportModal from './components/ExportModal';
import { Sparkles, Shield, Cpu, Zap } from 'lucide-react';

function SubtitleWizardApp() {
  const [subtitles, setSubtitles] = useState(() => {
    const saved = loadProjectSession();
    return saved?.subtitles || [];
  });

  const [currentFile, setCurrentFile] = useState(() => {
    const saved = loadProjectSession();
    return saved?.currentFile || null;
  });

  const [undoStack, setUndoStack] = useState([]);

  // Player & Sync state
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [activePlayingCueId, setActivePlayingCueId] = useState(null);
  const [seekTimestampMs, setSeekTimestampMs] = useState(null);

  // Modals state
  const [isTimingModalOpen, setIsTimingModalOpen] = useState(false);
  const [timingModalInitialCueId, setTimingModalInitialCueId] = useState(null);
  const [timingModalSelectedIds, setTimingModalSelectedIds] = useState([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const { settings } = useSettings();

  const queue = useTranslationQueue({
    subtitles,
    setSubtitles,
    settings,
  });

  // Auto-save project session to localStorage on modifications
  useEffect(() => {
    if (subtitles && subtitles.length > 0) {
      saveProjectSession({
        subtitles,
        currentFile,
        sourceLang: queue.sourceLang,
        targetLang: queue.targetLang,
      });
    }
  }, [subtitles, currentFile, queue.sourceLang, queue.targetLang]);

  // Save current subtitles to undo history before mutating
  const pushSnapshot = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-20), JSON.stringify(subtitles)]);
  }, [subtitles]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const lastSnapshot = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    try {
      const restored = JSON.parse(lastSnapshot);
      setSubtitles(restored);
    } catch (err) {
      console.error('Failed to restore undo snapshot:', err);
    }
  }, [undoStack]);

  const handleSubtitlesLoaded = (fileData) => {
    setCurrentFile(fileData);
    setSubtitles(fileData.subtitles || []);
    setUndoStack([]);
  };

  const handleClear = () => {
    queue.cancelTranslation();
    setSubtitles([]);
    setCurrentFile(null);
    setUndoStack([]);
    clearProjectSession();
  };

  const handleNewProject = () => {
    if (subtitles.length > 0) {
      const confirmed = window.confirm(
        '¿Deseas iniciar un nuevo proyecto? Los cambios no exportados se limpiarán de la memoria.'
      );
      if (!confirmed) return;
    }
    handleClear();
  };

  // Cue manipulation operations with undo tracking
  const handleUpdateCue = (cueId, updates) => {
    setSubtitles((prev) => updateCueInList(prev, cueId, updates));
  };

  const handleAddCueAfter = (afterId) => {
    pushSnapshot();
    setSubtitles((prev) => insertCueAfter(prev, afterId));
  };

  const handleSplitCue = (cueId) => {
    pushSnapshot();
    setSubtitles((prev) => splitCueInList(prev, cueId));
  };

  const handleMergeWithNext = (cueId) => {
    pushSnapshot();
    setSubtitles((prev) => mergeWithNextCue(prev, cueId));
  };

  const handleDeleteCue = (cueId) => {
    pushSnapshot();
    setSubtitles((prev) => removeCue(prev, cueId));
  };

  const handleApplyShift = (offsetMs, options) => {
    pushSnapshot();
    setSubtitles((prev) => shiftTimestamps(prev, offsetMs, options));
  };

  const handleOpenTimingModal = (cueId = null, selectedIds = []) => {
    setTimingModalInitialCueId(cueId);
    setTimingModalSelectedIds(selectedIds || []);
    setIsTimingModalOpen(true);
  };

  const handleSeekMedia = (startMs) => {
    setIsPlayerVisible(true);
    setSeekTimestampMs(startMs);
  };

  const hasSubtitles = subtitles.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#090a0f] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Header
        onTogglePlayer={() => setIsPlayerVisible(!isPlayerVisible)}
        isPlayerActive={isPlayerVisible}
        onNewProject={hasSubtitles ? handleNewProject : null}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Hero / Capabilities Pills */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-indigo-950/20 via-slate-900/40 to-slate-900/20 p-6 sm:p-8 backdrop-blur-xl">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Complete In-Browser Subtitle & AI Translation Suite</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white m-0">
                Subtitle Wizard
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed m-0">
                Edición interactiva in-place, sincronización temporal con cálculo de milisegundos, diagnóstico de solapamientos, reproductor multimedia local sincronizado y exportación multiformato (.srt, .vtt, .ass, .txt, bilingüe dual).
              </p>
            </div>

            {/* Feature Badges */}
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs font-medium text-slate-300">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Zero Cloud Storage</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs font-medium text-slate-300">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Local LM Studio</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs font-medium text-slate-300">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Live Caption Sync</span>
              </div>
            </div>
          </div>
        </section>

        {/* Local Synchronized Media Player (Collapsible / Toggleable) */}
        {(isPlayerVisible || hasSubtitles) && (
          <section>
            <MediaSyncPlayer
              subtitles={subtitles}
              seekTimestampMs={seekTimestampMs}
              onActiveCueChange={setActivePlayingCueId}
              onUpdateCue={handleUpdateCue}
            />
          </section>
        )}

        {/* File Uploader Dropzone */}
        <section>
          <FileUploader
            onSubtitlesLoaded={handleSubtitlesLoaded}
            onClear={handleClear}
            currentFile={currentFile}
            subtitleCount={subtitles.length}
          />
        </section>

        {/* Aggregate Stats Metrics Bar */}
        {hasSubtitles && (
          <section>
            <StatsBar subtitles={subtitles} />
          </section>
        )}

        {/* Translation Control Panel */}
        {hasSubtitles && (
          <section className="space-y-4">
            <TranslationControlBar
              queue={queue}
              hasSubtitles={hasSubtitles}
            />
            <TranslationProgressBar queue={queue} />
          </section>
        )}

        {/* Subtitle Cue List & Comparative Interactive Editor */}
        <section>
          <SubtitlePreview
            subtitles={subtitles}
            fileName={currentFile ? currentFile.name : 'subtitles.srt'}
            onRetrySingleCue={queue.retrySingleCue}
            onUpdateCue={handleUpdateCue}
            onAddCueAfter={handleAddCueAfter}
            onSplitCue={handleSplitCue}
            onMergeWithNext={handleMergeWithNext}
            onDeleteCue={handleDeleteCue}
            onOpenTimingModal={handleOpenTimingModal}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onUndo={handleUndo}
            canUndo={undoStack.length > 0}
            activePlayingCueId={activePlayingCueId}
            onSeekMedia={handleSeekMedia}
          />
        </section>

      </main>

      {/* Global Modals */}
      <SettingsModal />
      
      <TimingShiftModal
        isOpen={isTimingModalOpen}
        onClose={() => setIsTimingModalOpen(false)}
        subtitles={subtitles}
        onApplyShift={handleApplyShift}
        initialCueId={timingModalInitialCueId}
        selectedIds={timingModalSelectedIds}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        subtitles={subtitles}
        baseFileName={currentFile ? currentFile.name : 'subtitles.srt'}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 mt-12 bg-slate-950/40 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-400">Subtitle Wizard</span> • 100% In-Memory Local Subtitle & AI Translation Suite
          </div>
          <div>
            100% In-Browser Processing • Zero Cloud Dependencies
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <SettingsProvider>
        <SubtitleWizardApp />
      </SettingsProvider>
    </I18nProvider>
  );
}
