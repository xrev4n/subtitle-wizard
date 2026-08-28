import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '../context/I18nContext';
import {
  exportToSRT,
  exportToVTT,
  exportToASS,
  exportToTXT,
  downloadBlob,
} from '../utils/exporters';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';

export default function ExportModal({
  isOpen,
  onClose,
  subtitles = [],
  baseFileName = 'subtitles.srt',
}) {
  const { t } = useTranslation();
  const [format, setFormat] = useState('srt'); // 'srt' | 'vtt' | 'ass' | 'txt'
  const [contentMode, setContentMode] = useState('translated'); // 'translated' | 'source' | 'dual'
  const [customFilename, setCustomFilename] = useState('');
  const [copied, setCopied] = useState(false);

  const cleanBaseName = useMemo(() => {
    return baseFileName.replace(/\.[a-z0-9]+$/i, '');
  }, [baseFileName]);

  const defaultFilename = useMemo(() => {
    const suffix =
      contentMode === 'dual'
        ? '_bilingual'
        : contentMode === 'source'
        ? '_source'
        : '_translated';
    return `${cleanBaseName}${suffix}.${format}`;
  }, [cleanBaseName, contentMode, format]);

  const filename = customFilename || defaultFilename;

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

  // Generate serialized content in memory based on selections
  const generatedContent = useMemo(() => {
    if (!subtitles || subtitles.length === 0) return '';
    switch (format) {
      case 'vtt':
        return exportToVTT(subtitles, contentMode);
      case 'ass':
        return exportToASS(subtitles, contentMode, cleanBaseName);
      case 'txt':
        return exportToTXT(subtitles, contentMode);
      case 'srt':
      default:
        return exportToSRT(subtitles, contentMode);
    }
  }, [subtitles, format, contentMode, cleanBaseName]);

  if (!isOpen) return null;

  const lineCount = generatedContent.split('\n').length;
  const sizeBytes = new Blob([generatedContent]).size;
  const formattedSize =
    sizeBytes > 1024
      ? `${(sizeBytes / 1024).toFixed(1)} KB`
      : `${sizeBytes} B`;

  const handleDownload = () => {
    let mimeType = 'text/plain;charset=utf-8';
    if (format === 'vtt') mimeType = 'text/vtt;charset=utf-8';
    if (format === 'ass') mimeType = 'text/x-ssa;charset=utf-8';
    downloadBlob(generatedContent, filename, mimeType);
    onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white m-0 p-0 leading-tight">
                {t('export.title')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 m-0 p-0">
                {t('export.subtitle')}
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
        <div className="p-6 space-y-5 text-left overflow-y-auto flex-1">
          
          {/* Format Selector Pills */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Formato de Archivo:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'srt', label: 'SubRip (.srt)', icon: FileText },
                { id: 'vtt', label: 'WebVTT (.vtt)', icon: FileCode },
                { id: 'ass', label: 'ASS / SSA (.ass)', icon: Sparkles },
                { id: 'txt', label: 'Texto (.txt)', icon: Layers },
              ].map((fmt) => {
                const IconComponent = fmt.icon;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => {
                      setFormat(fmt.id);
                      setCustomFilename('');
                    }}
                    className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      format === fmt.id
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950/70 text-slate-300 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              {t('export.contentMode.label')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setContentMode('translated');
                  setCustomFilename('');
                }}
                className={`p-3 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                  contentMode === 'translated'
                    ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('export.contentMode.translated')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setContentMode('source');
                  setCustomFilename('');
                }}
                className={`p-3 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                  contentMode === 'source'
                    ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('export.contentMode.source')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setContentMode('dual');
                  setCustomFilename('');
                }}
                className={`p-3 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                  contentMode === 'dual'
                    ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('export.contentMode.dual')}
              </button>
            </div>
          </div>

          {/* Filename Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {t('export.options.filenameLabel')}
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setCustomFilename(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Live Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                {t('export.options.previewLabel')}
              </span>
              <span className="font-mono text-[11px]">
                {lineCount} líneas • {formattedSize}
              </span>
            </div>
            <pre className="p-3.5 bg-slate-950 border border-white/10 rounded-2xl text-slate-300 font-mono text-xs max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap selection:bg-indigo-600">
              {generatedContent}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t('export.actions.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span>{t('export.actions.copy')}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors cursor-pointer"
            >
              {t('export.actions.close')}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{t('export.actions.download')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
