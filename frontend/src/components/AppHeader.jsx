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
  isMobile,
}) => {
  return (
    <header className={`flex justify-between items-center ${isMobile ? 'mb-2 gap-1.5' : 'mb-3 gap-3'}`}>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleSidebar}
          className={`rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isMobile ? 'p-2' : 'p-1.5'}`}
          aria-label="Открыть меню"
          title="Профиль"
        >
          <Menu size={isMobile ? 20 : 16} />
        </button>
        {!isMobile && (
          <h1 className="text-sm font-bold flex items-center gap-1.5 whitespace-nowrap">
            <Sparkles className="text-yellow-400" size={16} />
            <span className="text-[13px]">Reels Subtitle Generator</span>
          </h1>
        )}
      </div>

      <div className={`flex items-center ${isMobile ? 'gap-1 flex-wrap justify-end' : 'gap-2 flex-nowrap'}`}>
        {!isMobile && <LanguageSelector value={language} onChange={onLanguageChange} />}

        <label className={`flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-all font-medium whitespace-nowrap focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 focus-within:ring-offset-gray-950 ${isMobile ? 'p-2' : 'px-2.5 py-1 text-xs'}`}>
          {loading ? <Loader2 className="animate-spin" size={isMobile ? 18 : 14} /> : <Upload size={isMobile ? 18 : 14} />}
          {!isMobile && <span>{loading ? loadingMessage : (isDragging ? "Drop Here" : "Upload Video")}</span>}
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
            className={`flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all font-medium shadow-lg shadow-purple-500/20 disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isMobile ? 'p-2' : 'px-2.5 py-1 text-xs'}`}
            aria-label="Generate subtitles"
            title="Generate Subtitles"
          >
            {loading ? <Loader2 className="animate-spin" size={isMobile ? 18 : 14} /> : <Wand2 size={isMobile ? 18 : 14} />}
            {!isMobile && <span>{loading ? loadingMessage : 'Generate Subtitles'}</span>}
          </button>
        )}

        {videoSrc && (
          <button
            onClick={onExport}
            disabled={loading || subtitles.length === 0}
            className={`flex items-center gap-1.5 bg-green-600 hover:bg-green-700 rounded-lg transition-all font-medium shadow-lg shadow-green-500/20 disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isMobile ? 'p-2' : 'px-2.5 py-1 text-xs'}`}
            aria-label="Export MP4"
            title="Export MP4"
          >
            {loading ? <Loader2 className="animate-spin" size={isMobile ? 18 : 14} /> : <Upload size={isMobile ? 18 : 14} className="rotate-180" />}
            {!isMobile && <span>Export MP4</span>}
          </button>
        )}

        {subtitles.length > 0 && (
          <button
            onClick={onSaveProject}
            disabled={savingProject}
            className={`flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-all font-medium shadow-lg shadow-cyan-500/20 disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isMobile ? 'p-2' : 'px-2.5 py-1 text-xs'}`}
            title="Сохранить проект"
            aria-label="Save project"
          >
            <Save size={isMobile ? 18 : 14} />
            {!isMobile && <span>{savingProject ? 'Saving...' : (projectId ? 'Сохранить' : 'Сохранить проект')}</span>}
          </button>
        )}
      </div>
    </header>
  );
});

AppHeader.displayName = 'AppHeader';

export default AppHeader;
