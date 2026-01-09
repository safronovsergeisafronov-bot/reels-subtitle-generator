import React, { forwardRef } from 'react';

const VideoPlayer = forwardRef(({ src, onTimeUpdate, onLoadedMetadata }, ref) => {
    if (!src) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500 rounded-lg border-2 border-dashed border-gray-700">
                <p>No video selected</p>
            </div>
        );
    }

    return (
        <div className="relative w-full rounded-lg overflow-hidden bg-black shadow-lg">
            <video
                ref={ref}
                src={src}
                className="w-full max-h-[80vh] object-contain"
                controls
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
            />
        </div>
    );
});

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
