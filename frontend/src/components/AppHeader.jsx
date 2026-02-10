import React, { memo } from 'react';
import LanguageSelector from './LanguageSelector';
import { Upload, Loader2, Sparkles, Wand2, Save, Menu } from 'lucide-react';

const AppHeader = memo(({
  language,
  onLanguageChange,
  loading,
  loadingMessage,
  isDragging,
  videoSrc,
  currentFilename,
  subtitles,
  savingProject,
  projectId,
  onFileUpload,
  onGenerateSubtitles,
  onExport,
  onSaveProject,
  onToggleSidebar,
}) => {
  return (
    <header className="flex justify-between items-center mb-3 gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Открыть меню"
          title="Профиль"
        >
          <Menu size={16} />
        </button>
        <h1 className="text-sm font-bold flex items-center gap-1.5 whitespace-nowrap">
          <Sparkles className="text-yellow-400" size={16} />
          <span className="text-[13px]">Reels Subtitle Generator</span>
        </h1>
      </div>

      <div className="flex items-center gap-2 flex-nowrap">
        <LanguageSelector value={language} onChange={onLanguageChange} />

        <label className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg cursor-pointer transition-all font-medium text-xs whitespace-nowrap focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 focus-within:ring-offset-gray-950">
          {loading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
          <span>{loading ? loadingMessage : (isDragging ? "Drop Here" : "Upload Video")}</span>
          <input
            type="file"
            accept="video/mp4,video/mov,video/quicktime"
            className="hidden"
            onChange={onFileUpload}
            disabled={loading}
            aria-label="Upload video file"
          />
        </label>

        {videoSrc && (
          <button
            onClick={onGenerateSubtitles}
            disabled={loading || !currentFilename}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 px-2.5 py-1 rounded-lg transition-all font-medium text-xs shadow-lg shadow-purple-500/20 disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Generate subtitles"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
            <span>{loading ? loadingMessage : 'Generate Subtitles'}</span>
          </button>
        )}

        {videoSrc && (
          <button
            onClick={onExport}
            disabled={loading || subtitles.length === 0}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 px-2.5 py-1 rounded-lg transition-all font-medium text-xs shadow-lg shadow-green-500/20 disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Export MP4"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} className="rotate-180" />}
            <span>Export MP4</span>
          </button>
        )}

        {subtitles.length > 0 && (
          <button
            onClick={onSaveProject}
            disabled={savingProject}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 px-2.5 py-1 rounded-lg transition-all font-medium text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Сохранить проект"
            aria-label="Save project"
          >
            <Save size={14} />
            <span>{savingProject ? 'Saving...' : (projectId ? 'Сохранить' : 'Сохранить проект')}</span>
          </button>
        )}
      </div>
    </header>
  );
});

AppHeader.displayName = 'AppHeader';

export default AppHeader;
