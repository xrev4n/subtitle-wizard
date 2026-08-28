import { useState, useCallback, useEffect } from 'react';
import { I18nProvider, useTranslation } from './context/I18nContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { useTranslationQueue } from './hooks/useTranslationQueue';
import { parseSRT } from './utils/srtParser';
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
import { detectSubtitleTracks } from './services/mediaExtractorService';
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
import TrackSelectorModal from './components/TrackSelectorModal';
import { Sparkles, Shield, Cpu, ExternalLink } from 'lucide-react';

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

  // Player & Media state managed at root
  const [activeMediaFile, setActiveMediaFile] = useState(null);
  const [activeMediaUrl, setActiveMediaUrl] = useState(null);
  const [activePlayingCueId, setActivePlayingCueId] = useState(null);
  const [seekTimestampMs, setSeekTimestampMs] = useState(null);

  // Extractor & Track selector modal state
  const [detectedTracks, setDetectedTracks] = useState([]);
  const [isTrackSelectorOpen, setIsTrackSelectorOpen] = useState(false);
  const [inspectingMediaFile, setInspectingMediaFile] = useState(null);

  // Other Modals state
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

  // Clean up Object URL on unmount
  useEffect(() => {
    return () => {
      if (activeMediaUrl) {
        URL.revokeObjectURL(activeMediaUrl);
      }
    };
  }, [activeMediaUrl]);

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
    if (activeMediaUrl) {
      URL.revokeObjectURL(activeMediaUrl);
    }
    setActiveMediaFile(null);
    setActiveMediaUrl(null);
    setDetectedTracks([]);
    setUndoStack([]);
    clearProjectSession();
  };

  const handleNewProject = () => {
    if (subtitles.length > 0) {
      const confirmed = window.confirm(t('header.actions.newProjectConfirm'));
      if (!confirmed) return;
    }
    handleClear();
  };

  const handleClearAll = () => {
    const confirmed = window.confirm(t('header.actions.clearAllConfirm'));
    if (!confirmed) return;
    handleClear();
  };

  // Media container dropped in dropzone or loaded from player
  const handleMediaFileDropped = async (mediaFile) => {
    if (!mediaFile) return;

    if (activeMediaUrl) {
      URL.revokeObjectURL(activeMediaUrl);
    }
    const newUrl = URL.createObjectURL(mediaFile);
    setActiveMediaFile(mediaFile);
    setActiveMediaUrl(newUrl);
    setInspectingMediaFile(mediaFile);

    try {
      const tracks = await detectSubtitleTracks(mediaFile);
      if (tracks && tracks.length > 0) {
        setDetectedTracks(tracks);
        setIsTrackSelectorOpen(true);
      } else {
        // Video has no embedded text tracks: if workspace empty, create ready initial cue
        if (subtitles.length === 0) {
          const initialCues = [
            {
              id: 1,
              startTime: '00:00:01,000',
              endTime: '00:00:05,000',
              startMs: 1000,
              endMs: 5000,
              sourceText: 'Escribe tu primer subtítulo aquí / Type subtitle here...',
              targetText: '',
              status: 'pending',
            },
          ];
          handleSubtitlesLoaded({
            name: `${mediaFile.name.replace(/\.[^.]+$/, '')}.srt`,
            size: 0,
            rawContent: '',
            subtitles: initialCues,
            isSample: false,
          });
        }
      }
    } catch (err) {
      console.warn('[App] Error inspecting media tracks:', err);
    }
  };

  // User dropped both a video and a subtitle file simultaneously
  const handleMediaAndSubtitlesLoaded = ({ mediaFile, subtitleData }) => {
    if (activeMediaUrl) {
      URL.revokeObjectURL(activeMediaUrl);
    }
    const newUrl = URL.createObjectURL(mediaFile);
    setActiveMediaFile(mediaFile);
    setActiveMediaUrl(newUrl);
    handleSubtitlesLoaded(subtitleData);
  };

  // User selected an embedded subtitle track from TrackSelectorModal
  const handleTrackSelected = ({ track, rawContent, mediaFile }) => {
    try {
      const parsed = parseSRT(rawContent);
      handleSubtitlesLoaded({
        name: `${mediaFile.name.replace(/\.[^.]+$/, '')}_${track.language || 'track'}.srt`,
        size: new Blob([rawContent]).size,
        rawContent,
        subtitles: parsed,
        isSample: false,
      });
      setIsTrackSelectorOpen(false);
    } catch (err) {
      console.error('[App] Error parsing extracted track:', err);
    }
  };

  const handleSkipTrackSelection = () => {
    setIsTrackSelectorOpen(false);
    if (inspectingMediaFile && subtitles.length === 0) {
      const initialCues = [
        {
          id: 1,
          startTime: '00:00:01,000',
          endTime: '00:00:05,000',
          startMs: 1000,
          endMs: 5000,
          sourceText: 'Escribe tu primer subtítulo aquí...',
          targetText: '',
          status: 'pending',
        },
      ];
      handleSubtitlesLoaded({
        name: `${inspectingMediaFile.name.replace(/\.[^.]+$/, '')}.srt`,
        size: 0,
        rawContent: '',
        subtitles: initialCues,
        isSample: false,
      });
    }
  };

  const handleRemoveMedia = () => {
    if (activeMediaUrl) {
      URL.revokeObjectURL(activeMediaUrl);
    }
    setActiveMediaFile(null);
    setActiveMediaUrl(null);
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
                <span>{t('common.hero.badge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white m-0">
                {t('common.hero.title')}
              </h2>
              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed m-0">
                {t('common.hero.description')}
              </p>

              {/* Feature Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-white/10 text-xs font-medium text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('common.hero.badges.zeroCloud')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-white/10 text-xs font-medium text-slate-300">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('common.hero.badges.localLlm')}</span>
                </div>
              </div>
            </div>

            {/* Multi-Format File Dropzone */}
            <FileUploader
              onSubtitlesLoaded={handleSubtitlesLoaded}
              onMediaFileDropped={handleMediaFileDropped}
              onMediaAndSubtitlesLoaded={handleMediaAndSubtitlesLoaded}
            />

          </div>
        ) : (
          /* Active Unified Workspace */
          <div className="space-y-6 animate-fadeIn">
            
            {/* 1. Top Media Studio (Left: Stage / Right: Live Lyrics) */}
            <section>
              <MediaSyncPlayer
                key={activeMediaUrl || 'canvas'}
                subtitles={subtitles}
                seekTimestampMs={seekTimestampMs}
                mediaFile={activeMediaFile}
                mediaUrl={activeMediaUrl}
                onMediaSelected={handleMediaFileDropped}
                onRemoveMedia={handleRemoveMedia}
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

      {/* Embedded Subtitle Track Selector Modal */}
      <TrackSelectorModal
        isOpen={isTrackSelectorOpen}
        onClose={() => setIsTrackSelectorOpen(false)}
        tracks={detectedTracks}
        mediaFile={inspectingMediaFile}
        onTrackSelected={handleTrackSelected}
        onSkip={handleSkipTrackSelection}
      />

      {/* Minimal Footer */}
      <footer className="border-t border-white/5 py-6 mt-10 bg-slate-950/40 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left: Product & Tagline */}
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span className="font-semibold text-slate-300">Subtitle Wizard</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="text-slate-400">{t('common.footer.tagline')}</span>
          </div>

          {/* Center & Right: CC0 License & GitHub Profile */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-center">
            {/* CC0 Public Domain Badge / Link */}
            <a
              href="https://creativecommons.org/publicdomain/zero/1.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-slate-200 transition-colors text-[11px] font-medium"
              title="Creative Commons Zero v1.0 Universal - Dominio Público"
            >
              <span className="font-bold text-slate-300">CC0</span>
              <span>{t('common.footer.license')}</span>
            </a>

            {/* Author GitHub Link */}
            <a
              href="https://github.com/xrev4n"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-colors text-[11px] font-medium group"
              title="GitHub: xrev4n"
            >
              <svg
                className="w-3.5 h-3.5 fill-slate-400 group-hover:fill-white transition-colors"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>xrev4n</span>
              <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </a>
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
