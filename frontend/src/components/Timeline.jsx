import React, { useRef, useState, useEffect, useCallback } from 'react';

const Timeline = ({ subtitles, currentTime, duration, onUpdateSubtitles, onSeek }) => {
    const timelineRef = useRef(null);
    const playheadRef = useRef(null);
    const dragTimeRef = useRef(null);
    const rafRef = useRef(null);
    const currentTimeRef = useRef(currentTime);
    const ppsRef = useRef(50);
    const [pixelsPerSecond, setPixelsPerSecond] = useState(50);

    // Keep refs in sync for non-React event handlers
    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { ppsRef.current = pixelsPerSecond; }, [pixelsPerSecond]);
    const SNAP_THRESHOLD = 0.15; // seconds
    const [dragging, setDragging] = useState(null);
    const [clipboard, setClipboard] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [collisionIndex, setCollisionIndex] = useState(null);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

    // Snapping logic
    const getSnapPoints = (excludeIndex) => {
        const points = [0];
        subtitles.forEach((sub, idx) => {
            if (idx !== excludeIndex) {
                points.push(sub.start);
                points.push(sub.end);
            }
        });
        if (duration) points.push(duration);
        return points;
    };

    const snapTo = (value, excludeIndex) => {
        const points = getSnapPoints(excludeIndex);
        for (const point of points) {
            if (Math.abs(value - point) < SNAP_THRESHOLD) {
                return point;
            }
        }
        return value;
    };

    // Snap time to subtitle edges
    const snapPlayhead = (time) => {
        const PLAYHEAD_SNAP = 0.15;
        for (const sub of subtitles) {
            if (Math.abs(time - sub.start) < PLAYHEAD_SNAP) return sub.start;
            if (Math.abs(time - sub.end) < PLAYHEAD_SNAP) return sub.end;
        }
        return time;
    };

    // Collision detection - returns the index of the colliding subtitle, or -1
    const findCollision = (start, end, excludeIndex) => {
        for (let i = 0; i < subtitles.length; i++) {
            if (i === excludeIndex) continue;
            const other = subtitles[i];
            if (start < other.end && end > other.start) {
                return i;
            }
        }
        return -1;
    };

    const checkCollision = (start, end, excludeIndex) => {
        return findCollision(start, end, excludeIndex) !== -1;
    };

    // Flash collision feedback
    const flashCollision = (index) => {
        setCollisionIndex(index);
        setTimeout(() => setCollisionIndex(null), 300);
    };

    const handleMouseDown = (index, type, e) => {
        e.stopPropagation();
        setSelectedIndex(index);
        const initialValue = type === 'move' ? subtitles[index].start : (type === 'start' ? subtitles[index].start : subtitles[index].end);
        setDragging({ index, type, initialX: e.clientX, initialValue, originalSub: { ...subtitles[index] } });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!dragging) return;

            const deltaX = e.clientX - dragging.initialX;
            const deltaTime = deltaX / pixelsPerSecond;
            const newSubtitles = [...subtitles];
            const sub = { ...newSubtitles[dragging.index] };
            const originalSub = dragging.originalSub;

            let newStart = sub.start;
            let newEnd = sub.end;

            if (dragging.type === 'move') {
                const subDuration = originalSub.end - originalSub.start;
                newStart = Math.max(0, dragging.initialValue + deltaTime);
                newStart = snapTo(newStart, dragging.index);
                newEnd = newStart + subDuration;
                // Also snap end
                const snappedEnd = snapTo(newEnd, dragging.index);
                if (snappedEnd !== newEnd) {
                    newEnd = snappedEnd;
                    newStart = newEnd - subDuration;
                }
            } else if (dragging.type === 'start') {
                newStart = Math.max(0, Math.min(sub.end - 0.1, dragging.initialValue + deltaTime));
                newStart = snapTo(newStart, dragging.index);
                if (newStart >= sub.end - 0.1) newStart = sub.end - 0.1;
            } else if (dragging.type === 'end') {
                newEnd = Math.max(sub.start + 0.1, Math.min(duration, dragging.initialValue + deltaTime));
                newEnd = snapTo(newEnd, dragging.index);
                if (newEnd <= sub.start + 0.1) newEnd = sub.start + 0.1;
            }

            // Collision prevention with flash feedback
            const collidingIdx = findCollision(newStart, newEnd, dragging.index);
            if (collidingIdx !== -1) {
                flashCollision(collidingIdx);
                return; // Don't apply changes that cause collision
            }

            sub.start = newStart;
            sub.end = newEnd;

            newSubtitles[dragging.index] = sub;
            onUpdateSubtitles(newSubtitles);
        };

        const handleMouseUp = () => {
            setDragging(null);
        };

        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, subtitles, onUpdateSubtitles, duration, pixelsPerSecond]);

    // Playhead drag logic — direct DOM manipulation + rAF throttled seeking for max smoothness
    useEffect(() => {
        if (!isDraggingPlayhead) return;

        const handleMouseMove = (e) => {
            if (!timelineRef.current) return;
            const rect = timelineRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
            let time = Math.max(0, Math.min(duration, x / pixelsPerSecond));
            time = snapPlayhead(time);

            dragTimeRef.current = time;

            // Immediate visual update via DOM — no React re-render
            if (playheadRef.current) {
                playheadRef.current.style.left = `${time * pixelsPerSecond - 7}px`;
            }

            // Throttled video seek via requestAnimationFrame
            if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(() => {
                    if (dragTimeRef.current !== null) {
                        onSeek(dragTimeRef.current);
                    }
                    rafRef.current = null;
                });
            }
        };

        const handleMouseUp = () => {
            // Final seek to exact position
            if (dragTimeRef.current !== null) {
                onSeek(dragTimeRef.current);
                dragTimeRef.current = null;
            }
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            setIsDraggingPlayhead(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [isDraggingPlayhead, duration, pixelsPerSecond, onSeek, subtitles]);

    // Cmd/Ctrl + scroll wheel zoom — centered on playhead position
    useEffect(() => {
        const el = timelineRef.current;
        if (!el) return;

        const handleWheel = (e) => {
            if (e.metaKey || e.ctrlKey) {
                e.preventDefault();
                const oldPps = ppsRef.current;
                const ct = currentTimeRef.current;
                const delta = e.deltaY > 0 ? -5 : 5;
                const newPps = Math.max(20, Math.min(200, oldPps + delta));
                if (newPps === oldPps) return;

                // Remember playhead's viewport-relative position before zoom
                const playheadViewportX = ct * oldPps - el.scrollLeft;

                setPixelsPerSecond(newPps);
                ppsRef.current = newPps;

                // After render, adjust scroll so playhead stays at same viewport position
                requestAnimationFrame(() => {
                    el.scrollLeft = ct * newPps - playheadViewportX;
                });
            }
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    // Copy/Paste keyboard handlers
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedIndex === null) return;

            // Cmd/Ctrl + C - Copy
            if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
                e.preventDefault();
                setClipboard({ ...subtitles[selectedIndex] });
            }

            // Cmd/Ctrl + V - Paste
            if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) {
                e.preventDefault();
                const newSub = { ...clipboard };
                // Find a spot after all existing subtitles
                const lastEnd = subtitles.reduce((max, sub) => Math.max(max, sub.end), 0);
                const subDuration = clipboard.end - clipboard.start;
                newSub.start = lastEnd + 0.1;
                newSub.end = newSub.start + subDuration;

                if (!checkCollision(newSub.start, newSub.end, -1)) {
                    onUpdateSubtitles([...subtitles, newSub]);
                }
            }

            // Delete key - Remove subtitle
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                const newSubtitles = subtitles.filter((_, idx) => idx !== selectedIndex);
                onUpdateSubtitles(newSubtitles);
                setSelectedIndex(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, clipboard, subtitles, onUpdateSubtitles]);

    // Compute playhead position: during drag use ref, otherwise use prop
    const playheadLeft = (isDraggingPlayhead && dragTimeRef.current !== null)
        ? dragTimeRef.current * pixelsPerSecond - 7
        : (currentTime || 0) * pixelsPerSecond - 7;

    return (
        <div className="bg-gray-950 border-t border-gray-800 h-full flex flex-col overflow-hidden" role="region" aria-label="Timeline">
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-800 bg-gray-900/50">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Timeline</span>
                <div className="flex items-center gap-4">
                    {clipboard && <span className="text-[10px] text-green-400 bg-green-900/30 px-2 py-0.5 rounded">Copied</span>}
                    <span className="text-[10px] text-gray-500 font-mono">
                        {Math.round(pixelsPerSecond / 50 * 100)}%
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono bg-black px-2 py-0.5 rounded border border-gray-800">
                        {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
                    </span>
                </div>
            </div>

            <div
                ref={timelineRef}
                className="flex-1 relative overflow-x-auto overflow-y-hidden select-none custom-scrollbar"
                onMouseDown={(e) => {
                    // Only respond to clicks on the timeline background, not subtitle blocks
                    if (e.target !== e.currentTarget && !e.target.classList.contains('timeline-bg')) return;
                    if (!timelineRef.current) return;
                    const rect = timelineRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
                    const time = Math.max(0, Math.min(duration, x / pixelsPerSecond));
                    onSeek(time);
                    setIsDraggingPlayhead(true);
                    setSelectedIndex(null);
                    // Immediately position playhead via DOM
                    if (playheadRef.current) {
                        playheadRef.current.style.left = `${time * pixelsPerSecond - 7}px`;
                    }
                }}
                style={{ cursor: 'crosshair' }}
            >
                {/* Time Markers */}
                <div className="absolute top-0 left-0 h-6 flex border-b border-gray-800 timeline-bg" style={{ width: Math.max(window.innerWidth, (duration || 0) * pixelsPerSecond) }}>
                    {Array.from({ length: Math.ceil(duration || 0) + 1 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute border-l border-gray-800/60 h-full text-[9px] text-gray-500 pl-1 pt-1 timeline-bg"
                            style={{ left: i * pixelsPerSecond }}
                        >
                            {i}s
                        </div>
                    ))}
                    {/* Minor tick marks */}
                    {Array.from({ length: Math.ceil(duration || 0) * 2 + 1 }).map((_, i) => {
                        if (i % 2 === 0) return null;
                        return (
                            <div
                                key={`minor-${i}`}
                                className="absolute w-px h-2 bg-gray-800/40 bottom-0 timeline-bg"
                                style={{ left: (i * 0.5) * pixelsPerSecond }}
                            />
                        );
                    })}
                </div>

                {/* Subtitle Track */}
                <div className="absolute top-10 left-0 h-16 w-full flex items-center bg-gray-900/20 timeline-bg">
                    {(subtitles || []).map((sub, index) => (
                        <div
                            key={index}
                            className={`absolute h-10 rounded-lg transition-all duration-200 group
                                ${collisionIndex === index ? 'animate-pulse ring-2 ring-red-500' : ''}
                                ${selectedIndex === index
                                    ? 'bg-gradient-to-r from-blue-600/80 to-cyan-600/80 border border-cyan-400/60 text-white z-20 shadow-lg shadow-cyan-500/20'
                                    : currentTime >= sub.start && currentTime <= sub.end
                                        ? 'bg-gradient-to-r from-violet-600/70 to-purple-600/70 border border-violet-400/40 text-white z-10 shadow-md shadow-violet-500/15'
                                        : 'bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:bg-gray-700/60 hover:border-gray-600/50 hover:text-gray-300'
                                } flex flex-col items-center justify-center text-[10px] px-2 truncate overflow-hidden cursor-move`}
                            style={{
                                left: sub.start * pixelsPerSecond,
                                width: (sub.end - sub.start) * pixelsPerSecond,
                            }}
                            onMouseDown={(e) => handleMouseDown(index, 'move', e)}
                        >
                            {/* Left resize handle */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-l-lg
                                    bg-white/0 hover:bg-white/30 group-hover:bg-white/10 transition-all duration-150 z-20"
                                onMouseDown={(e) => handleMouseDown(index, 'start', e)}
                            />
                            {/* Right resize handle */}
                            <div
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-r-lg
                                    bg-white/0 hover:bg-white/30 group-hover:bg-white/10 transition-all duration-150 z-20"
                                onMouseDown={(e) => handleMouseDown(index, 'end', e)}
                            />

                            <span className="truncate w-full text-center font-medium text-[10px] leading-tight">{sub.text}</span>
                            <span className="text-[8px] opacity-50 font-mono">{(sub.end - sub.start).toFixed(1)}s</span>
                        </div>
                    ))}
                </div>

                {/* Playhead — ref-driven for smooth dragging */}
                <div
                    ref={playheadRef}
                    className="absolute top-0 bottom-0 z-30"
                    style={{ left: playheadLeft, width: 15, cursor: 'ew-resize', willChange: 'left' }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        setIsDraggingPlayhead(true);
                    }}
                    role="slider"
                    aria-label="Playhead position"
                    aria-valuemin={0}
                    aria-valuemax={duration}
                    aria-valuenow={Math.round(currentTime * 100) / 100}
                    aria-valuetext={`${currentTime.toFixed(2)} seconds`}
                    tabIndex={0}
                >
                    <div className="absolute left-[7px] top-0 bottom-0 w-px bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                    <svg className="absolute -top-0.5" style={{ left: 2 }} width="11" height="8" viewBox="0 0 11 8">
                        <polygon points="5.5,8 0,0 11,0" fill="#ef4444" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default Timeline;
