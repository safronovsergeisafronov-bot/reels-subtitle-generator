import React, { memo, useCallback } from 'react';
import SubtitleList from './SubtitleList';
import StylePanel from './StylePanel';
import { List, Type, Undo2, Redo2 } from 'lucide-react';
import { useToast } from './Toast';

const RightPanel = memo(({
  activeTab,
  onTabChange,
  subtitles,
  currentTime,
  onSeek,
  onUpdateSubtitles,
  subtitleStyles,
  onUpdateStyles,
  fonts,
  onApplyPreset,
  videoDimensions,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  leftPanelWidth,
  isMobile,
}) => {
  const { toast } = useToast();

  const handleUndo = useCallback(() => {
    onUndo();
    toast({ type: 'info', message: 'Undo' });
  }, [onUndo, toast]);

  const handleRedo = useCallback(() => {
    onRedo();
    toast({ type: 'info', message: 'Redo' });
  }, [onRedo, toast]);

  return (
    <div
      className={`flex flex-col bg-gray-950 ${isMobile ? 'flex-1 min-h-0 border-t border-gray-800' : 'border-l border-gray-800'}`}
      style={isMobile ? undefined : { width: `${100 - leftPanelWidth}%` }}
    >
      <div className="flex items-center bg-gray-900/80 p-1 border-b border-gray-800" role="tablist" aria-label="Panel tabs">
        <button
          onClick={() => onTabChange('subtitles')}
          className={`flex-1 flex items-center justify-center gap-2 ${isMobile ? 'py-3 text-sm' : 'py-2 text-xs'} font-bold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeTab === 'subtitles' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          role="tab"
          aria-selected={activeTab === 'subtitles'}
          aria-controls="panel-subtitles"
        >
          <List size={isMobile ? 16 : 14} /> SUBTITLES
        </button>
        <button
          onClick={() => onTabChange('style')}
          className={`flex-1 flex items-center justify-center gap-2 ${isMobile ? 'py-3 text-sm' : 'py-2 text-xs'} font-bold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeTab === 'style' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          role="tab"
          aria-selected={activeTab === 'style'}
          aria-controls="panel-style"
        >
          <Type size={isMobile ? 16 : 14} /> STYLE
        </button>
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`rounded text-gray-500 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isMobile ? 'p-2' : 'p-1.5'}`}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 size={isMobile ? 18 : 14} />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`rounded text-gray-500 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isMobile ? 'p-2' : 'p-1.5'}`}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
          >
            <Redo2 size={isMobile ? 18 : 14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col" role="tabpanel" id={`panel-${activeTab}`} aria-label={activeTab === 'subtitles' ? 'Subtitles panel' : 'Style panel'}>
        {activeTab === 'subtitles' ? (
          <>
            <div className={`border-b border-gray-800 bg-gray-900/30 ${isMobile ? 'p-3' : 'p-4'}`}>
              <h2 className="font-semibold text-gray-300 text-sm">Active Subtitles ({subtitles.length})</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <SubtitleList
                subtitles={subtitles}
                currentTime={currentTime}
                onSeek={onSeek}
                onUpdateSubtitle={onUpdateSubtitles}
              />
            </div>
          </>
        ) : (
          <StylePanel
            styles={subtitleStyles}
            onUpdateStyles={onUpdateStyles}
            fontList={fonts}
            onApplyPreset={onApplyPreset}
            videoDimensions={videoDimensions}
          />
        )}
      </div>
    </div>
  );
});

RightPanel.displayName = 'RightPanel';

export default RightPanel;
