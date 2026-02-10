import React, { useState } from 'react';
import { Play, Pause, Maximize, Volume2, VolumeX, Gauge, HelpCircle } from 'lucide-react';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const VideoControls = ({
    isPlaying,
    onPlayPause,
    currentTime,
    duration,
    onFullscreen,
    playbackRate = 1,
    onPlaybackRateChange,
    volume = 1,
    onVolumeChange,
    isMuted = false,
    onMuteToggle,
    onShowShortcuts,
}) => {
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '00:00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900/90 border-t border-gray-800">
            {/* Left: Time Display + Volume */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-cyan-400 font-bold">{formatTime(currentTime)}</span>
                    <span className="text-gray-500">/</span>
                    <span className="text-gray-400">{formatTime(duration)}</span>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={onMuteToggle}
                        className="p-1 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        title={isMuted ? "Unmute" : "Mute"}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => onVolumeChange && onVolumeChange(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        aria-label="Volume"
                    />
                </div>
            </div>

            {/* Center: Play/Pause Button */}
            <button
                onClick={onPlayPause}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                aria-label={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? (
                    <Pause size={18} className="text-white fill-white" />
                ) : (
                    <Play size={18} className="text-white fill-white ml-0.5" />
                )}
            </button>

            {/* Right: Speed, Fullscreen, Help */}
            <div className="flex items-center gap-2">
                {/* Playback Speed */}
                <div className="relative">
                    <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 transition-all text-xs font-medium text-gray-300 border border-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        title="Playback speed"
                        aria-label={`Playback speed: ${playbackRate}x`}
                        aria-expanded={showSpeedMenu}
                        aria-haspopup="true"
                    >
                        <Gauge size={14} />
                        <span>{playbackRate}x</span>
                    </button>
                    {showSpeedMenu && (
                        <div className="absolute bottom-full mb-1 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50">
                            {SPEED_OPTIONS.map((speed) => (
                                <button
                                    key={speed}
                                    onClick={() => {
                                        onPlaybackRateChange && onPlaybackRateChange(speed);
                                        setShowSpeedMenu(false);
                                    }}
                                    className={`block w-full px-4 py-1.5 text-xs text-left hover:bg-gray-700 transition-colors ${
                                        playbackRate === speed ? 'text-cyan-400 font-bold' : 'text-gray-300'
                                    }`}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Fullscreen Button */}
                <button
                    onClick={onFullscreen}
                    className="flex items-center gap-2 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 transition-all text-xs font-medium text-gray-300 border border-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="Full screen"
                >
                    <Maximize size={14} />
                    <span>Full Screen</span>
                </button>

                {/* Help Button */}
                {onShowShortcuts && (
                    <button
                        onClick={onShowShortcuts}
                        className="flex items-center justify-center w-8 h-8 rounded bg-gray-800 hover:bg-gray-700 transition-all text-gray-400 hover:text-white border border-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        title="Keyboard shortcuts"
                        aria-label="Keyboard shortcuts"
                    >
                        <HelpCircle size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default VideoControls;
