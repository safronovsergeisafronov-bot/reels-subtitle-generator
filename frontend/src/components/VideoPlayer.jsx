import React, { forwardRef } from 'react';

const VideoPlayer = forwardRef(({ src, onTimeUpdate, onLoadedMetadata, children }, ref) => {
    if (!src) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500 rounded-lg border-2 border-dashed border-gray-700">
                <p>No video selected</p>
            </div>
        );
    }

    return (
        <div id="video-container" className="relative inline-block rounded-lg overflow-hidden bg-black shadow-2xl transition-all border border-gray-800">
            <video
                ref={ref}
                src={src}
                className="block max-w-full max-h-[70vh] object-contain"
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
            />
            {children}
        </div>
    );
});

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
