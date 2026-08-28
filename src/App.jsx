import { useState, useCallback, useEffect } from 'react';
import { I18nProvider, useTranslation } from './context/I18nContext';
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
  const { t } = useTranslation();
  const [subtitles, setSubtitles] = useState(() => {
    const saved = loadProjectSession();
    return saved?.subtitles || [];
  });

  const [currentFile, setCurrentFile] = useState(() => {
    const saved = loadProjectSession();
    return saved?.currentFile || null;
  });

  const [undoStack, setUndoStack] = useState([]);
  const [playerResetKey, setPlayerResetKey] = useState(0);

  // Player & Sync state
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
    setPlayerResetKey((prev) => prev + 1);
  };

  const handleNewProject = () => {
    if (subtitles.length > 0) {
      const confirmed = window.confirm(
        '¿Deseas iniciar un nuevo proyecto? Los subtítulos actuales se limpiarán para cargar un nuevo archivo.'
      );
      if (!confirmed) return;
    }
    handleClear();
  };

  const handleClearAll = () => {
    const confirmed = window.confirm(t('header.actions.clearAllConfirm'));
    if (!confirmed) return;
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
    setSeekTimestampMs(startMs);
  };

  const hasSubtitles = subtitles.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#090a0f] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Minimalist Navigation Header */}
      <Header
        onNewProject={hasSubtitles ? handleNewProject : null}
        onClearAll={hasSubtitles ? handleClearAll : null}
        hasActiveProject={hasSubtitles}
      />

      {/* Main Unified Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {!hasSubtitles ? (
          /* Initial Landing View when no subtitles loaded */
          <div className="max-w-4xl mx-auto space-y-8 pt-4">
            
            {/* Minimalist Hero */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>100% In-Browser Memory Workspace</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white m-0">
                Subtitle Wizard
              </h2>
              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed m-0">
                Edición interactiva, sincronización en vivo, traducción IA por lotes con LM Studio local y exportación multiformato.
              </p>

              {/* Feature Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-white/10 text-xs font-medium text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero Cloud</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-white/10 text-xs font-medium text-slate-300">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Local LLM</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-white/10 text-xs font-medium text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Spotify Lyrics Flow</span>
                </div>
              </div>
            </div>

            {/* File Dropzone */}
            <FileUploader onSubtitlesLoaded={handleSubtitlesLoaded} />

          </div>
        ) : (
          /* Active Unified Workspace */
          <div className="space-y-6 animate-fadeIn">
            
            {/* 1. Top Media Studio (Left: Stage / Right: Spotify Lyrics) */}
            <section>
              <MediaSyncPlayer
                key={playerResetKey}
                subtitles={subtitles}
                seekTimestampMs={seekTimestampMs}
                onActiveCueChange={setActivePlayingCueId}
                onUpdateCue={handleUpdateCue}
              />
            </section>

            {/* 2. Compact Statistics metrics bar */}
            <section>
              <StatsBar subtitles={subtitles} />
            </section>

            {/* 3. Translation Control & Live Progress Panel */}
            <section className="space-y-3">
              <TranslationControlBar
                queue={queue}
                hasSubtitles={hasSubtitles}
              />
              <TranslationProgressBar queue={queue} />
            </section>

            {/* 4. Detailed Cue Editor & Integrity Diagnostics */}
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

          </div>
        )}

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

      {/* Minimal Footer */}
      <footer className="border-t border-white/5 py-5 mt-10 bg-slate-950/40 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-400">Subtitle Wizard</span> • Minimalist In-Memory Subtitle & Translation Suite
          </div>
          <div>
            100% Local Processing • Zero External Servers
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
