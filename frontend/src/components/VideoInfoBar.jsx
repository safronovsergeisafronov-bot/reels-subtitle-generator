import React, { memo } from 'react';
import { Monitor } from 'lucide-react';

const VideoInfoBar = memo(({ videoSrc, videoDimensions, duration, subtitleStyles }) => {
  if (!videoSrc) {
    return (
      <div className="mt-4 text-xs text-center text-gray-500">
        Drop a video file here or click "Upload Video" to get started. Press <span className="text-gray-400">?</span> for shortcuts.
      </div>
    );
  }

  return (
    <div className="mt-2 px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-800">
      <div className="flex items-center justify-center gap-6 text-[10px] text-gray-400 font-mono">
        <span className="flex items-center gap-1.5">
          <Monitor size={10} className="text-gray-500" />
          <span className="text-gray-500">RES</span>
          {videoDimensions.width}x{videoDimensions.height}
        </span>
        <span>
          <span className="text-gray-500">DUR </span>
          {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}.{String(Math.floor((duration % 1) * 10)).padStart(1, '0')}
        </span>
        <span>
          <span className="text-gray-500">RATIO </span>
          {videoDimensions.height > 0 ? (videoDimensions.width / videoDimensions.height).toFixed(2) : '\u2014'}
        </span>
        <span>
          <span className="text-gray-500">POS </span>
          {subtitleStyles.position.x},{subtitleStyles.position.y}
        </span>
      </div>
    </div>
  );
});

VideoInfoBar.displayName = 'VideoInfoBar';

export default VideoInfoBar;
