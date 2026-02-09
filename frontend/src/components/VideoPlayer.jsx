import React, { forwardRef, useState, useEffect } from 'react';

const VideoPlayer = forwardRef(({ src, onTimeUpdate, onLoadedMetadata, videoDimensions, children }, ref) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showEscHint, setShowEscHint] = useState(false);

    useEffect(() => {
        const handleFsChange = () => {
            const fs = !!document.fullscreenElement;
            setIsFullscreen(fs);
            if (fs) {
                setShowEscHint(true);
                const timer = setTimeout(() => setShowEscHint(false), 4000);
                return () => clearTimeout(timer);
            }
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        document.addEventListener('webkitfullscreenchange', handleFsChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange);
            document.removeEventListener('webkitfullscreenchange', handleFsChange);
        };
    }, []);

    if (!src) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500 rounded-lg border-2 border-dashed border-gray-700">
                <p>No video selected</p>
            </div>
        );
    }

    const w = videoDimensions?.width || 1080;
    const h = videoDimensions?.height || 1920;
    const aspectRatio = `${w} / ${h}`;

    return (
        <div
            id="video-container"
            className={`bg-black overflow-hidden ${
                isFullscreen
                    ? 'flex items-center justify-center'
                    : 'relative rounded-lg shadow-2xl border border-gray-800'
            }`}
            style={isFullscreen ? undefined : { aspectRatio, maxWidth: '100%', maxHeight: '100%' }}
        >
            <div
                className="relative"
                style={isFullscreen
                    ? { aspectRatio, maxWidth: '100vw', maxHeight: '100vh' }
                    : { width: '100%', height: '100%' }
                }
            >
                <video
                    ref={ref}
                    src={src}
                    className="w-full h-full"
                    onTimeUpdate={onTimeUpdate}
                    onLoadedMetadata={onLoadedMetadata}
                />
                {children}
            </div>

            {/* Fullscreen ESC hint */}
            {isFullscreen && showEscHint && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-sm px-5 py-3 rounded-xl z-50 shadow-lg border border-gray-700 transition-opacity duration-1000">
                    Нажмите <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1 font-mono text-xs border border-gray-600">esc</kbd> для выхода из полноэкранного режима
                </div>
            )}
        </div>
    );
});

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
