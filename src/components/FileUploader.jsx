import { useState, useRef } from 'react';
import { useTranslation } from '../context/I18nContext';
import { parseSRT, SAMPLE_SRT } from '../utils/srtParser';
import {
  isMediaContainer,
  isStandaloneSubtitle,
  convertSubtitleToSRT,
} from '../services/mediaExtractorService';
import { UploadCloud, FileText, Sparkles, AlertCircle } from 'lucide-react';

export default function FileUploader({
  onSubtitlesLoaded,
  onMediaFileDropped,
  onMediaAndSubtitlesLoaded,
}) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const processFileList = (files) => {
    setErrorMessage('');
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Multi-drop: Check if user dropped both a video and a subtitle file
    const mediaFile = fileArray.find((f) => isMediaContainer(f));
    const subFile = fileArray.find((f) => isStandaloneSubtitle(f));

    if (mediaFile && subFile && onMediaAndSubtitlesLoaded) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const rawContent = e.target.result;
          const srtContent = convertSubtitleToSRT(rawContent, subFile.name);
          const parsed = parseSRT(srtContent);
          if (parsed.length === 0) {
            setErrorMessage(t('common.alerts.emptyFile'));
            return;
          }
          onMediaAndSubtitlesLoaded({
            mediaFile,
            subtitleData: {
              name: subFile.name,
              size: subFile.size,
              rawContent: srtContent,
              subtitles: parsed,
              isSample: false,
            },
          });
        } catch (err) {
          console.error('Error parsing subtitle file:', err);
          setErrorMessage(t('common.alerts.invalidFile'));
        }
      };
      reader.onerror = () => setErrorMessage(t('common.alerts.invalidFile'));
      reader.readAsText(subFile, 'UTF-8');
      return;
    }

    // Single file processing
    const file = fileArray[0];
    if (isMediaContainer(file)) {
      if (onMediaFileDropped) {
        onMediaFileDropped(file);
      }
      return;
    }

    if (isStandaloneSubtitle(file)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const rawContent = e.target.result;
          if (!rawContent || typeof rawContent !== 'string' || rawContent.trim().length === 0) {
            setErrorMessage(t('common.alerts.emptyFile'));
            return;
          }

          const srtContent = convertSubtitleToSRT(rawContent, file.name);
          const parsed = parseSRT(srtContent);
          if (parsed.length === 0) {
            setErrorMessage(t('common.alerts.emptyFile'));
            return;
          }

          onSubtitlesLoaded({
            name: file.name.replace(/\.(vtt|ass|ssa)$/i, '.srt'),
            size: file.size,
            rawContent: srtContent,
            subtitles: parsed,
            isSample: false,
          });
        } catch (err) {
          console.error('Error parsing subtitle file:', err);
          setErrorMessage(t('common.alerts.invalidFile'));
        }
      };

      reader.onerror = () => {
        setErrorMessage(t('common.alerts.invalidFile'));
      };

      reader.readAsText(file, 'UTF-8');
      return;
    }

    // If file extension is unsupported
    setErrorMessage(t('common.alerts.invalidFile'));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileList(e.target.files);
    }
  };

  const handleLoadSample = () => {
    setErrorMessage('');
    const parsed = parseSRT(SAMPLE_SRT);
    onSubtitlesLoaded({
      name: 'sample_dialogue_en.srt',
      size: new Blob([SAMPLE_SRT]).size,
      rawContent: SAMPLE_SRT,
      subtitles: parsed,
      isSample: true,
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Hidden native input with multiple format support */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".srt,.vtt,.ass,.ssa,.mp4,.mkv,.webm,.mov,.m4v,.mp3,.wav"
        multiple
        className="hidden"
        id="media-subtitle-file-input"
      />

      {/* Error alert */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-rose-400 hover:text-rose-200 text-xs underline font-medium cursor-pointer"
          >
            {t('common.actions.close')}
          </button>
        </div>
      )}

      {/* Clean Initial Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-10 sm:p-16 text-center transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.005]'
            : 'border-white/15 hover:border-indigo-400/50 bg-slate-900/40 hover:bg-slate-900/70'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
          
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 group-hover:bg-indigo-600/20 transition-transform duration-200">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-semibold text-white">
              {t('parser.dropzone.title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              {t('parser.dropzone.subtitle')}
            </p>
            <p className="text-[11px] text-slate-500 pt-1">
              {t('parser.dropzone.support')}
            </p>
          </div>

          {/* Action buttons */}
          <div
            className="flex flex-wrap items-center justify-center gap-2.5 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              {t('common.actions.upload')}
            </button>

            <button
              type="button"
              onClick={handleLoadSample}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 hover:border-white/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              {t('common.actions.sample')}
            </button>
          </div>

          {/* Supported format tags */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3">
            {['.SRT', '.VTT', '.ASS', '.MP4', '.MKV', '.WEBM', '.MOV'].map((fmt) => (
              <span
                key={fmt}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-slate-900/90 border border-white/10"
              >
                {fmt}
              </span>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
