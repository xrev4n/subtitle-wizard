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
  mediaFile = null,
  mediaUrl = null,
  onMediaSelected,
  onRemoveMedia,
  onActiveCueChange,
  onUpdateCue,
}) {
  const { t } = useTranslation();
  const isVideo = Boolean(
    mediaFile?.type?.startsWith('video/') ||
      mediaFile?.name?.match(/\.(mp4|webm|mkv|mov|m4v)$/i)
  );

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
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onMediaSelected) {
      onMediaSelected(file);
    }
  };

  const handleInternalRemoveMedia = () => {
    if (onRemoveMedia) {
      onRemoveMedia();
    }
    setIsPlaying(false);
  };

  // Find active subtitle cue in memory at current playback millisecond
  const activeCue = subtitles.find(
    (s) => s.startMs <= currentTimeMs && currentTimeMs <= s.endMs
  );

  // Notify parent of active playing cue
  useEffect(() => {
    if (onActiveCueChange) {
      onActiveCueChange(activeCue ? activeCue.id : null);
    }
  }, [activeCue, onActiveCueChange]);

  // Play / Pause toggle
  const togglePlay = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
        setIsPlaying(false);
      } else {
        mediaRef.current.play().catch((err) => {
          console.warn('Playback error:', err);
        });
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Skip relative offset in seconds (+5s, -5s)
  const skipSeconds = (seconds) => {
    const targetMs = Math.max(0, Math.min(effectiveDurationMs, currentTimeMs + seconds * 1000));
    if (mediaRef.current) {
      mediaRef.current.currentTime = targetMs / 1000;
    }
    setCurrentTimeMs(targetMs);
  };

  // Handle media timeupdate
  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTimeMs(Math.round(mediaRef.current.currentTime * 1000));
    }
  };

  // Handle metadata loaded (video duration)
  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDurationMs(Math.round(mediaRef.current.duration * 1000));
      mediaRef.current.volume = volume;
      mediaRef.current.playbackRate = playbackRate;
    }
  };

  // Handle seek bar interaction
  const handleSeekChange = (e) => {
    const targetMs = parseInt(e.target.value, 10);
    setCurrentTimeMs(targetMs);
    if (mediaRef.current) {
      mediaRef.current.currentTime = targetMs / 1000;
    }
  };

  // Speed and volume handlers
  const handleSpeedChange = (rate) => {
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
        onChange={handleFileInputChange}
        accept="video/*,audio/*,.mkv,.mp4,.webm,.mov,.m4v,.mp3,.wav,.m4a"
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
                {mediaUrl ? (isVideo ? t('player.videoPlayer') : t('player.audioPlayer')) : t('player.canvasPreview')}
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
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Off
            </button>
          </div>

          {/* Upload / Replace Media Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Cargar archivo de video o audio local"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">
              {mediaUrl ? t('player.replaceMedia') : t('player.loadMedia')}
            </span>
          </button>

          {/* Remove Media Button */}
          {mediaUrl && (
            <button
              type="button"
              onClick={handleInternalRemoveMedia}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Quitar medio y volver a lienzo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Studio: Left = Video/Canvas Stage | Right = Spotify Lyrics Flow Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x divide-white/10 bg-slate-950/60">
        
        {/* LEFT COLUMN: Stage & Player Controls (Span 7 on lg) */}
        <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between space-y-4">
          
          <div className="space-y-3">
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
                <div className="absolute inset-x-4 bottom-4 flex flex-col items-center pointer-events-none z-10">
                  <div className="bg-black/85 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-xl shadow-2xl text-center max-w-[90%] transition-all animate-fadeIn">
                    {(captionMode === 'dual' || captionMode === 'translated') && (
                      <p className="text-sm sm:text-base font-bold text-white leading-snug drop-shadow-md">
                        {activeCue.targetText || activeCue.sourceText}
                      </p>
                    )}
                    {captionMode === 'dual' && activeCue.targetText && (
                      <p className="text-xs sm:text-sm text-indigo-300/90 font-medium mt-1 leading-snug drop-shadow">
                        {activeCue.sourceText}
                      </p>
                    )}
                    {captionMode === 'source' && (
                      <p className="text-sm sm:text-base font-bold text-white leading-snug drop-shadow-md">
                        {activeCue.sourceText}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Playback Timeline Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max={effectiveDurationMs || 1000}
                value={currentTimeMs}
                onChange={handleSeekChange}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400 px-0.5">
                <span>{formatDuration(currentTimeMs)}</span>
                <span>{formatDuration(effectiveDurationMs)}</span>
              </div>
            </div>
          </div>

          {/* Unified Audio / Video Player Control Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
            {/* Play, Pause, Rewind & Forward */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => skipSeconds(-5)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Retroceder 5 segundos"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => skipSeconds(5)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Avanzar 5 segundos"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-white/10 text-xs">
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                    playbackRate === rate
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Volume & Mute */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Spotify Lyrics Flow & Live In-Place Editor (Span 5 on lg) */}
        <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col h-full min-h-[380px] max-h-[460px]">
          <LyricsSyncPanel
            subtitles={subtitles}
            currentTimeMs={currentTimeMs}
            activeCueId={activeCue?.id}
            onSeek={useCallback((targetMs) => {
              if (mediaRef.current) {
                mediaRef.current.currentTime = targetMs / 1000;
              }
              setCurrentTimeMs(targetMs);
            }, [])}
            onPausePlayback={useCallback(() => {
              if (mediaRef.current && !mediaRef.current.paused) {
                mediaRef.current.pause();
                setIsPlaying(false);
              } else if (!mediaRef.current && isPlaying) {
                setIsPlaying(false);
              }
            }, [isPlaying])}
            onUpdateCue={onUpdateCue}
          />
        </div>

      </div>

    </div>
  );
}
