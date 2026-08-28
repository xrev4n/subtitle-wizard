import { useState, useRef } from 'react';
import { useTranslation } from '../context/I18nContext';
import { parseSRT, SAMPLE_SRT } from '../utils/srtParser';
import { UploadCloud, FileText, Sparkles, Trash2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function FileUploader({
  onSubtitlesLoaded,
  onClear,
  currentFile,
  subtitleCount = 0,
}) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    setErrorMessage('');
    if (!file) return;

    // Validate file extension
    const isSrt = file.name.toLowerCase().endsWith('.srt');
    if (!isSrt) {
      setErrorMessage(t('common.alerts.invalidFile'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
          setErrorMessage(t('common.alerts.emptyFile'));
          return;
        }

        const parsed = parseSRT(content);
        if (parsed.length === 0) {
          setErrorMessage(t('common.alerts.emptyFile'));
          return;
        }

        onSubtitlesLoaded({
          name: file.name,
          size: file.size,
          rawContent: content,
          subtitles: parsed,
          isSample: false,
        });
      } catch (err) {
        console.error('Error parsing SRT file:', err);
        setErrorMessage(t('common.alerts.invalidFile'));
      }
    };

    reader.onerror = () => {
      setErrorMessage(t('common.alerts.invalidFile'));
    };

    reader.readAsText(file, 'UTF-8');
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
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
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

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full space-y-4">
      {/* Hidden native input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".srt"
        className="hidden"
        id="srt-file-input"
      />

      {/* Error alert */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-rose-400 hover:text-rose-200 text-xs underline font-medium"
          >
            {t('common.actions.close')}
          </button>
        </div>
      )}

      {/* When no file is loaded: Drag & Drop Zone */}
      {!currentFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.008]'
              : 'border-white/15 hover:border-indigo-400/50 bg-slate-900/40 hover:bg-slate-900/70'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600/20 transition-transform duration-200">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                {t('parser.dropzone.title')}
              </h3>
              <p className="text-sm text-slate-400">
                {t('parser.dropzone.subtitle')}
              </p>
              <p className="text-xs text-slate-500 pt-1">
                {t('parser.dropzone.support')}
              </p>
            </div>

            {/* Action buttons */}
            <div
              className="flex flex-wrap items-center justify-center gap-3 pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {t('common.actions.upload')}
              </button>

              <button
                type="button"
                onClick={handleLoadSample}
                className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 hover:border-white/20 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                {t('common.actions.sample')}
              </button>
            </div>

          </div>
        </div>
      ) : (
        /* When file is loaded: Loaded file card */
        <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white text-base">
                  {currentFile.name}
                </span>
                {currentFile.isSample && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Sample
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {subtitleCount} {t('parser.preview.blocks')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t('parser.dropzone.fileSize')}: <span className="text-slate-300 font-mono">{formatFileSize(currentFile.size)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('parser.dropzone.replaceFile')}
            </button>
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('common.actions.clear')}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
