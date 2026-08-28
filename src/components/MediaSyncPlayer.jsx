import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../context/I18nContext';
import { formatDuration } from '../utils/srtParser';
import LyricsSyncPanel from './LyricsSyncPanel';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Upload,
  Video,
  Music,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function MediaSyncPlayer({
  subtitles = [],
  seekTimestampMs = null,
  onActiveCueChange,
  onUpdateCue,
}) {
  const { t } = useTranslation();
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [isVideo, setIsVideo] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [captionMode, setCaptionMode] = useState('dual'); // 'dual' | 'translated' | 'source' | 'off'

  const mediaRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasTimerRef = useRef(null);

  // Compute duration from subtitle list if no media loaded
  const fallbackDurationMs = subtitles.length > 0
    ? subtitles[subtitles.length - 1].endMs + 1000
    : 60000;

  const effectiveDurationMs = durationMs > 0 ? durationMs : fallbackDurationMs;

  // Clean up Object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [mediaUrl]);

  // Canvas timer animation when no video is loaded but playback is running
  useEffect(() => {
    if (!mediaUrl && isPlaying) {
      const interval = 50; // update every 50ms
      canvasTimerRef.current = setInterval(() => {
        setCurrentTimeMs((prev) => {
          const next = prev + interval * playbackRate;
          if (next >= effectiveDurationMs) {
            setIsPlaying(false);
            return effectiveDurationMs;
          }
          return next;
        });
      }, interval);
    } else {
      if (canvasTimerRef.current) {
        clearInterval(canvasTimerRef.current);
      }
    }
    return () => {
      if (canvasTimerRef.current) {
        clearInterval(canvasTimerRef.current);
      }
    };
  }, [isPlaying, mediaUrl, playbackRate, effectiveDurationMs]);

  // Handle external seek requests from table timestamp clicks or lyrics panel
  useEffect(() => {
    if (seekTimestampMs !== null) {
      if (mediaRef.current) {
        mediaRef.current.currentTime = seekTimestampMs / 1000;
        if (mediaRef.current.paused) {
          mediaRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      } else {
        setCurrentTimeMs(seekTimestampMs);
        setIsPlaying(true);
      }
    }
  }, [seekTimestampMs]);

  // Process selected local video/audio file
  const handleMediaSelected = (file) => {
    if (!file) return;
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }
    const url = URL.createObjectURL(file);
    const isVid = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mkv|mov)$/i);

    setMediaFile(file);
    setMediaUrl(url);
    setIsVideo(Boolean(isVid));
    setIsPlaying(false);
    setCurrentTimeMs(0);
  };

  const handleRemoveMedia = () => {
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }
    setMediaFile(null);
    setMediaUrl(null);
    setIsPlaying(false);
  };

  // Find active subtitle cue in memory at current playback millisecond
  const activeCue = subtitles.find(
    (s) => s.startMs <= currentTimeMs && currentTimeMs <= s.endMs
  );

  // Notify parent of active cue change for table highlighting
  useEffect(() => {
    if (onActiveCueChange) {
      onActiveCueChange(activeCue ? activeCue.id : null);
    }
  }, [activeCue, onActiveCueChange]);

  const togglePlay = () => {
    if (mediaRef.current) {
      if (mediaRef.current.paused) {
        mediaRef.current.play();
        setIsPlaying(true);
      } else {
        mediaRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const pauseMedia = useCallback(() => {
    if (mediaRef.current && !mediaRef.current.paused) {
      mediaRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  const handleSeekTimestamp = (ms) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = ms / 1000;
      setCurrentTimeMs(ms);
      if (mediaRef.current.paused) {
        mediaRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      setCurrentTimeMs(ms);
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!mediaRef.current) return;
    setCurrentTimeMs(Math.round(mediaRef.current.currentTime * 1000));
  };

  const handleLoadedMetadata = () => {
    if (!mediaRef.current) return;
    setDurationMs(Math.round(mediaRef.current.duration * 1000));
  };

  const handleSeek = (e) => {
    const seekMs = parseInt(e.target.value, 10);
    if (mediaRef.current) {
      mediaRef.current.currentTime = seekMs / 1000;
    }
    setCurrentTimeMs(seekMs);
  };

  const handleSkip = (seconds) => {
    const nextMs = Math.max(0, Math.min(effectiveDurationMs, currentTimeMs + seconds * 1000));
    if (mediaRef.current) {
      mediaRef.current.currentTime = nextMs / 1000;
    }
    setCurrentTimeMs(nextMs);
  };

  const handleRateChange = (rate) => {
    setPlaybackRate(rate);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    if (!mediaRef.current) return;
    mediaRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (mediaRef.current) {
      mediaRef.current.volume = val;
      mediaRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  return (
    <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl transition-all">
      
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && handleMediaSelected(e.target.files[0])}
        accept="video/*,audio/*,.mkv,.mp4,.webm,.mp3,.wav,.m4a"
        className="hidden"
      />

      {/* Top Studio Bar */}
      <div className="px-5 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-950/90">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            {mediaUrl ? (
              isVideo ? <Video className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />
            ) : (
              <Layers className="w-3.5 h-3.5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white m-0 p-0">
                {mediaUrl ? (isVideo ? 'Reproductor de Video' : 'Reproductor de Audio') : t('player.canvasPreview')}
              </h3>
              {mediaFile && (
                <span className="text-[11px] font-mono text-slate-400 max-w-[150px] truncate">
                  ({mediaFile.name})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action controls in Studio header */}
        <div className="flex items-center gap-2">
          {/* Caption Mode Selector */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setCaptionMode('dual')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                captionMode === 'dual'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dual
            </button>
            <button
              type="button"
              onClick={() => setCaptionMode('translated')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                captionMode === 'translated'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Trad
            </button>
            <button
              type="button"
              onClick={() => setCaptionMode('source')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                captionMode === 'source'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Orig
            </button>
            <button
              type="button"
              onClick={() => setCaptionMode('off')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                captionMode === 'off'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              Off
            </button>
          </div>

          {/* Load / Change Video Action */}
          {mediaUrl ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title={t('player.changeMedia')}
              >
                {t('player.changeMedia')}
              </button>
              <button
                type="button"
                onClick={handleRemoveMedia}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 cursor-pointer transition-colors"
                title={t('player.controls.removeMedia')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>{t('player.loadMedia')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Body: 2-Column Responsive Workspace */}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Left Column: Stage View & Transport Controls (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-3">
            
            {/* Pure Black Stage Surface (Video or Dark Canvas Preview) */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-[360px] flex items-center justify-center border border-white/10 shadow-inner group">
              {mediaUrl ? (
                isVideo ? (
                  <video
                    ref={mediaRef}
                    src={mediaUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    onClick={togglePlay}
                    className="w-full h-full object-contain cursor-pointer bg-black"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-3 bg-black p-6">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                      <Music className="w-7 h-7" />
                    </div>
                    <audio
                      ref={mediaRef}
                      src={mediaUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                    />
                    <span className="text-xs text-slate-300 font-mono">
                      {mediaFile?.name}
                    </span>
                  </div>
                )
              ) : (
                /* Pure Black Simulated Canvas Stage */
                <div
                  onClick={togglePlay}
                  className="w-full h-full flex flex-col items-center justify-center bg-black cursor-pointer select-none p-6 relative overflow-hidden"
                >
                  {!activeCue && (
                    <div className="text-center space-y-2 opacity-40">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mx-auto">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-slate-400">
                        {t('player.noMediaPrompt')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Live Synchronized Subtitle Overlay */}
              {captionMode !== 'off' && activeCue && (
                <div className="absolute bottom-4 inset-x-6 flex justify-center pointer-events-none transition-all">
                  <div className="max-w-xl px-4 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 text-center shadow-2xl space-y-1 animate-fadeIn">
                    {(captionMode === 'dual' || captionMode === 'source') && activeCue.sourceText && (
                      <p className="text-xs sm:text-sm font-medium text-slate-200 leading-snug drop-shadow-md m-0">
                        {activeCue.sourceText}
                      </p>
                    )}
                    {(captionMode === 'dual' || captionMode === 'translated') && (
                      <p className="text-xs sm:text-sm font-bold text-amber-300 leading-snug drop-shadow-md m-0">
                        {activeCue.targetText || (
                          <span className="italic text-slate-400 font-normal">
                            ({activeCue.sourceText})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Stage Timeline Scrubber */}
            <div className="space-y-1 px-1">
              <input
                type="range"
                min="0"
                max={effectiveDurationMs || 100}
                value={currentTimeMs}
                onChange={handleSeek}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{formatDuration(currentTimeMs)}</span>
                <span>{formatDuration(effectiveDurationMs)}</span>
              </div>
            </div>

            {/* Transport Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              
              {/* Playback action buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSkip(-5)}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                  title="-5s"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSkip(5)}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                  title="+5s"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                {/* Volume Control (only when media loaded) */}
                {mediaUrl && (
                  <div className="flex items-center gap-1.5 pl-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer hidden sm:block"
                    />
                  </div>
                )}
              </div>

              {/* Playback Speed selector */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  {t('player.controls.speed')}:
                </span>
                {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleRateChange(rate)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded-lg border transition-all cursor-pointer ${
                      playbackRate === rate
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-900/60 text-slate-400 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

            </div>

          </div>

          {/* Right Column: Spotify Lyrics Interactive Panel (lg:col-span-5) */}
          <div className="lg:col-span-5 w-full">
            <LyricsSyncPanel
              subtitles={subtitles}
              activeCueId={activeCue?.id}
              onSeek={handleSeekTimestamp}
              onUpdateCue={onUpdateCue}
              onPauseMedia={pauseMedia}
              isPlaying={isPlaying}
            />
          </div>

        </div>
      </div>

    </div>
  );
}
