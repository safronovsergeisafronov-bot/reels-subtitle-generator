import React from 'react';
import { Play, Pause, Maximize } from 'lucide-react';

const VideoControls = ({
    isPlaying,
    onPlayPause,
    currentTime,
    duration,
    onFullscreen
}) => {
    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '00:00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center justify-between px-6 py-3 bg-gray-900/90 border-t border-gray-800">
            {/* Time Display */}
            <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-cyan-400 font-bold">{formatTime(currentTime)}</span>
                <span className="text-gray-600">/</span>
                <span className="text-gray-400">{formatTime(duration)}</span>
            </div>

            {/* Play/Pause Button */}
            <button
                onClick={onPlayPause}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg hover:scale-105 active:scale-95"
            >
                {isPlaying ? (
                    <Pause size={24} className="text-white fill-white" />
                ) : (
                    <Play size={24} className="text-white fill-white ml-0.5" />
                )}
            </button>

            {/* Fullscreen Button */}
            <button
                onClick={onFullscreen}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 transition-all text-xs font-medium text-gray-300 border border-gray-700"
            >
                <Maximize size={14} />
                <span>Full Screen</span>
            </button>
        </div>
    );
};

export default VideoControls;
