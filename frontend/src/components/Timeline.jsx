import React, { useRef, useState, useEffect, useCallback } from 'react';

const Timeline = ({ subtitles, currentTime, duration, onUpdateSubtitles, onSeek }) => {
    const timelineRef = useRef(null);
    const pixelsPerSecond = 50;
    const SNAP_THRESHOLD = 0.15; // seconds
    const [dragging, setDragging] = useState(null);
    const [clipboard, setClipboard] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [collisionIndex, setCollisionIndex] = useState(null);

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
    }, [dragging, subtitles, onUpdateSubtitles, duration]);

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

    const handleTimelineClick = (e) => {
        if (!timelineRef.current || dragging) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
        const time = x / pixelsPerSecond;
        onSeek(Math.max(0, Math.min(duration, time)));
        setSelectedIndex(null);
    };

    return (
        <div className="bg-gray-950 border-t border-gray-800 h-36 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-800 bg-gray-900/50">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Timeline</span>
                <div className="flex items-center gap-4">
                    {clipboard && <span className="text-[10px] text-green-400 bg-green-900/30 px-2 py-0.5 rounded">Copied</span>}
                    <span className="text-[10px] text-gray-400 font-mono bg-black px-2 py-0.5 rounded border border-gray-800">
                        {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
                    </span>
                </div>
            </div>

            <div
                ref={timelineRef}
                className="flex-1 relative overflow-x-auto overflow-y-hidden select-none custom-scrollbar"
                onClick={handleTimelineClick}
                style={{ cursor: 'crosshair' }}
            >
                {/* Time Markers */}
                <div className="absolute top-0 left-0 h-6 flex border-b border-gray-800" style={{ width: Math.max(window.innerWidth, (duration || 0) * pixelsPerSecond) }}>
                    {Array.from({ length: Math.ceil(duration || 0) + 1 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute border-l border-gray-800 h-full text-[9px] text-gray-600 pl-1 pt-1"
                            style={{ left: i * pixelsPerSecond }}
                        >
                            {i}s
                        </div>
                    ))}
                </div>

                {/* Subtitle Track */}
                <div className="absolute top-10 left-0 h-16 w-full flex items-center bg-gray-900/20">
                    {(subtitles || []).map((sub, index) => (
                        <div
                            key={index}
                            className={`absolute h-10 rounded border transition-all group ${
                                collisionIndex === index
                                    ? 'collision-flash'
                                    : ''
                            } ${selectedIndex === index
                                    ? 'bg-cyan-600/60 border-cyan-400 text-white z-20 ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.3)]'
                                    : currentTime >= sub.start && currentTime <= sub.end
                                        ? 'bg-indigo-600/60 border-indigo-400 text-white z-10 shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                                        : 'bg-gray-800/40 border-gray-700/50 text-gray-500 opacity-80'
                                } flex flex-col items-center justify-center text-[10px] px-2 truncate overflow-hidden cursor-move hover:ring-2 hover:ring-indigo-500/50`}
                            style={{
                                left: sub.start * pixelsPerSecond,
                                width: (sub.end - sub.start) * pixelsPerSecond,
                            }}
                            onMouseDown={(e) => handleMouseDown(index, 'move', e)}
                        >
                            {/* Resize Handles */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-indigo-400/0 hover:bg-indigo-400/50 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                onMouseDown={(e) => handleMouseDown(index, 'start', e)}
                            />
                            <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-indigo-400/0 hover:bg-indigo-400/50 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                onMouseDown={(e) => handleMouseDown(index, 'end', e)}
                            />

                            <span className="truncate w-full text-center font-medium">{sub.text}</span>
                            <span className="text-[8px] opacity-40 mt-1">{(sub.end - sub.start).toFixed(1)}s</span>
                        </div>
                    ))}
                </div>

                {/* Playhead */}
                <div
                    className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
                    style={{ left: (currentTime || 0) * pixelsPerSecond }}
                >
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rotate-45 border border-red-400" />
                </div>
            </div>
        </div>
    );
};

export default Timeline;
