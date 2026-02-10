import React, { forwardRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Minimize, Volume2, VolumeX } from 'lucide-react';

const VideoPlayer = forwardRef(({ src, onTimeUpdate, onLoadedMetadata, videoDimensions, children }, ref) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showEscHint, setShowEscHint] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [hideTimer, setHideTimer] = useState(null);
    const [fsPlaying, setFsPlaying] = useState(false);
    const [fsTime, setFsTime] = useState(0);
    const [fsDuration, setFsDuration] = useState(0);
    const [fsVolume, setFsVolume] = useState(1);
    const [fsMuted, setFsMuted] = useState(false);

    useEffect(() => {
        const handleFsChange = () => {
            const fs = !!document.fullscreenElement;
            setIsFullscreen(fs);
            if (fs) {
                setShowEscHint(true);
                setShowControls(true);
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

    // Track video state for fullscreen controls
    useEffect(() => {
        const video = ref?.current;
        if (!video) return;
        const onPlay = () => setFsPlaying(true);
        const onPause = () => setFsPlaying(false);
        const onTime = () => { setFsTime(video.currentTime); setFsDuration(video.duration || 0); };
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('timeupdate', onTime);
        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('timeupdate', onTime);
        };
    }, [ref, src]);

    // Auto-hide fullscreen controls after 3s of no mouse movement
    const handleMouseMoveFs = useCallback(() => {
        if (!isFullscreen) return;
        setShowControls(true);
        if (hideTimer) clearTimeout(hideTimer);
        const t = setTimeout(() => setShowControls(false), 3000);
        setHideTimer(t);
    }, [isFullscreen, hideTimer]);

    const exitFs = useCallback(() => {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }, []);

    const togglePlay = useCallback(() => {
        const video = ref?.current;
        if (!video) return;
        if (video.paused) video.play();
        else video.pause();
    }, [ref]);

    const handleSeekFs = useCallback((e) => {
        const video = ref?.current;
        if (!video) return;
        video.currentTime = parseFloat(e.target.value);
    }, [ref]);

    const handleVolumeFs = useCallback((e) => {
        const video = ref?.current;
        if (!video) return;
        const v = parseFloat(e.target.value);
        video.volume = v;
        video.muted = v === 0;
        setFsVolume(v);
        setFsMuted(v === 0);
    }, [ref]);

    const toggleMuteFs = useCallback(() => {
        const video = ref?.current;
        if (!video) return;
        video.muted = !video.muted;
        setFsMuted(!fsMuted);
    }, [ref, fsMuted]);

    const formatTime = (s) => {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${String(sec).padStart(2, '0')}`;
    };

    if (!src) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500 rounded-lg border-2 border-dashed border-gray-700" role="region" aria-label="Video player">
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
            onMouseMove={isFullscreen ? handleMouseMoveFs : undefined}
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
                    onClick={isFullscreen ? togglePlay : undefined}
                />
                {children}
            </div>

            {/* Fullscreen ESC hint */}
            {isFullscreen && showEscHint && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-sm px-5 py-3 rounded-xl z-50 shadow-lg border border-gray-700 transition-opacity duration-1000">
                    Нажмите <kbd className="bg-gray-700 px-2 py-0.5 rounded mx-1 font-mono text-xs border border-gray-600">esc</kbd> для выхода
                </div>
            )}

            {/* Fullscreen floating controls */}
            {isFullscreen && (
                <div
                    className={`absolute bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
                        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
                >
                    <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pb-4 px-6">
                        {/* Progress bar */}
                        <input
                            type="range"
                            min="0"
                            max={fsDuration || 1}
                            step="0.1"
                            value={fsTime}
                            onChange={handleSeekFs}
                            className="w-full h-1.5 bg-gray-600 rounded-full appearance-none cursor-pointer accent-indigo-500 mb-3"
                            aria-label="Seek"
                        />
                        <div className="flex items-center justify-between">
                            {/* Left: play + time + volume */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={togglePlay}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                    aria-label={fsPlaying ? 'Pause' : 'Play'}
                                >
                                    {fsPlaying
                                        ? <Pause size={20} className="text-white fill-white" />
                                        : <Play size={20} className="text-white fill-white ml-0.5" />
                                    }
                                </button>
                                <span className="text-white text-sm font-mono">
                                    {formatTime(fsTime)} / {formatTime(fsDuration)}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={toggleMuteFs}
                                        className="text-white/70 hover:text-white transition-colors"
                                        aria-label={fsMuted ? 'Unmute' : 'Mute'}
                                    >
                                        {fsMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={fsMuted ? 0 : fsVolume}
                                        onChange={handleVolumeFs}
                                        className="w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-white"
                                        aria-label="Volume"
                                    />
                                </div>
                            </div>
                            {/* Right: exit fullscreen */}
                            <button
                                onClick={exitFs}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-sm"
                                aria-label="Exit fullscreen"
                            >
                                <Minimize size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
