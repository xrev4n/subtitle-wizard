import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../context/I18nContext';
import {
  ListMusic,
  Play,
  Sparkles,
  PauseCircle,
  ArrowUpDown,
  FileText,
} from 'lucide-react';

export default function LyricsSyncPanel({
  subtitles = [],
  activeCueId = null,
  onSeek,
  onUpdateCue,
  onPauseMedia,
  isPlaying = false,
}) {
  const { t } = useTranslation();
  const [channel, setChannel] = useState('translated'); // 'translated' | 'source' | 'dual'
  const [autoScroll, setAutoScroll] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const activeRowRef = useRef(null);
  const containerRef = useRef(null);

  // Smooth Auto-scroll to active cue in Spotify style (unless paused for editing or disabled)
  useEffect(() => {
    if (autoScroll && !isEditing && activeCueId && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeCueId, autoScroll, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
    if (isPlaying && onPauseMedia) {
      onPauseMedia();
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  if (!subtitles || subtitles.length === 0) {
    return (
      <div className="h-full min-h-[320px] rounded-2xl bg-slate-950/70 border border-white/10 p-6 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <ListMusic className="w-6 h-6" />
        </div>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xs">
          {t('player.lyrics.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[320px] max-h-[460px] flex flex-col rounded-2xl bg-slate-950/80 border border-white/10 overflow-hidden shadow-xl text-left backdrop-blur-xl">
      
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90">
        
        {/* Title & Status indicator */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <ListMusic className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white flex items-center gap-1.5 leading-none">
              {t('player.lyrics.title')}
              {isEditing && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  <PauseCircle className="w-2.5 h-2.5" />
                  {t('player.lyrics.pausedForEditing')}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Channel Selector & Auto-Scroll Toggle */}
        <div className="flex items-center gap-1.5">
          
          {/* Channel selector pills */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-white/10 text-[10px]">
            <button
              type="button"
              onClick={() => setChannel('translated')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                channel === 'translated'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('player.lyrics.channels.translated')}
            </button>

            <button
              type="button"
              onClick={() => setChannel('source')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                channel === 'source'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('player.lyrics.channels.source')}
            </button>

            <button
              type="button"
              onClick={() => setChannel('dual')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                channel === 'dual'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('player.lyrics.channels.dual')}
            </button>
          </div>

          {/* Auto-scroll toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border text-[10px] flex items-center gap-1 transition-all cursor-pointer ${
              autoScroll
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                : 'bg-slate-900/60 border-white/10 text-slate-500 hover:text-slate-300'
            }`}
            title="Auto-Scroll"
          >
            <ArrowUpDown className="w-3 h-3" />
          </button>

        </div>

      </div>

      {/* Spotify Lyrics Flow Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 divide-y divide-white/[0.03]"
      >
        {subtitles.map((cue) => {
          const isActive = activeCueId === cue.id;
          return (
            <div
              key={cue.id}
              ref={isActive ? activeRowRef : null}
              id={`lyrics-cue-${cue.id}`}
              className={`pt-2.5 first:pt-0 rounded-xl p-3 transition-all duration-300 group ${
                isActive
                  ? 'bg-indigo-950/40 border-l-4 border-indigo-400 shadow-lg shadow-indigo-950/50 scale-[1.01]'
                  : 'opacity-40 hover:opacity-90 hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                
                {/* Click-to-Seek Play Button */}
                <button
                  type="button"
                  onClick={() => onSeek && onSeek(cue.startMs)}
                  className={`mt-1 flex-shrink-0 p-1.5 rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/50 scale-110'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={t('player.lyrics.seekTo')}
                >
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </button>

                {/* Cue Text Lines (Editable In-Place) */}
                <div className="flex-1 space-y-1.5">
                  
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span
                      className={`font-semibold ${
                        isActive ? 'text-indigo-300' : 'text-slate-500'
                      }`}
                    >
                      #{cue.id} • {cue.startTime.slice(3, 8)}
                    </span>
                    {isActive && (
                      <span className="text-amber-400 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>En vivo</span>
                      </span>
                    )}
                  </div>

                  {/* Channel: Source text */}
                  {(channel === 'source' || channel === 'dual') && (
                    <div>
                      {channel === 'dual' && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <FileText className="w-2.5 h-2.5" />
                          <span>Original</span>
                        </span>
                      )}
                      <textarea
                        rows={1}
                        value={cue.sourceText || ''}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onChange={(e) =>
                          onUpdateCue &&
                          onUpdateCue(cue.id, { sourceText: e.target.value })
                        }
                        placeholder={t('parser.preview.emptySource')}
                        className={`w-full bg-transparent resize-none leading-snug focus:outline-none transition-colors ${
                          isActive
                            ? 'text-sm font-semibold text-white drop-shadow-sm'
                            : 'text-xs text-slate-300'
                        }`}
                      />
                    </div>
                  )}

                  {/* Channel: Target text */}
                  {(channel === 'translated' || channel === 'dual') && (
                    <div>
                      {channel === 'dual' && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Traducido</span>
                        </span>
                      )}
                      <textarea
                        rows={1}
                        value={cue.targetText || ''}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onChange={(e) =>
                          onUpdateCue &&
                          onUpdateCue(cue.id, {
                            targetText: e.target.value,
                            status: e.target.value.trim() ? 'translated' : 'pending',
                          })
                        }
                        placeholder={
                          cue.sourceText
                            ? `(Traducción de: "${cue.sourceText.slice(0, 30)}...")`
                            : 'Escribe traducción...'
                        }
                        className={`w-full bg-transparent resize-none leading-snug focus:outline-none transition-colors ${
                          isActive
                            ? 'text-sm sm:text-base font-bold text-amber-300 drop-shadow-md placeholder-amber-400/40'
                            : 'text-xs sm:text-sm font-medium text-amber-200/80 placeholder-slate-600'
                        }`}
                      />
                    </div>
                  )}

                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
