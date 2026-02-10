import React, { useRef, useState, useEffect, useCallback } from 'react';

const Timeline = ({ subtitles, currentTime, duration, onUpdateSubtitles, onSeek }) => {
    const timelineRef = useRef(null);
    const playheadRef = useRef(null);
    const dragTimeRef = useRef(null);
    const rafRef = useRef(null);
    const currentTimeRef = useRef(currentTime);
    const ppsRef = useRef(50);
    const [pixelsPerSecond, setPixelsPerSecond] = useState(50);

    // Drag state — stored in ref for zero-rerender dragging
    const dragRef = useRef(null);
    const subtitlesRef = useRef(subtitles);

    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { ppsRef.current = pixelsPerSecond; }, [pixelsPerSecond]);
    useEffect(() => { subtitlesRef.current = subtitles; }, [subtitles]);

    const SNAP_THRESHOLD = 0.15;
    const [clipboard, setClipboard] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
    // Force re-render counter (only incremented on drag end)
    const [, setRenderTick] = useState(0);

    const getSnapPoints = useCallback((excludeIndex, subs) => {
        const points = [0];
        subs.forEach((sub, idx) => {
            if (idx !== excludeIndex) {
                points.push(sub.start);
                points.push(sub.end);
            }
        });
        if (duration) points.push(duration);
        return points;
    }, [duration]);

    const snapTo = useCallback((value, excludeIndex, subs) => {
        const points = getSnapPoints(excludeIndex, subs);
        for (const point of points) {
            if (Math.abs(value - point) < SNAP_THRESHOLD) return point;
        }
        return value;
    }, [getSnapPoints]);

    const snapPlayhead = useCallback((time) => {
        const subs = subtitlesRef.current;
        for (const sub of subs) {
            if (Math.abs(time - sub.start) < 0.15) return sub.start;
            if (Math.abs(time - sub.end) < 0.15) return sub.end;
        }
        return time;
    }, []);

    // Clamp to prevent overlap: returns [newStart, newEnd] that don't overlap neighbors
    const clampNoOverlap = useCallback((start, end, excludeIndex, subs) => {
        let s = start, e = end;
        const dur = e - s;
        // Find nearest prev and next subtitle boundaries
        let prevEnd = 0;
        let nextStart = duration || Infinity;
        for (let i = 0; i < subs.length; i++) {
            if (i === excludeIndex) continue;
            if (subs[i].end <= start + 0.001 && subs[i].end > prevEnd) prevEnd = subs[i].end;
            if (subs[i].start >= end - 0.001 && subs[i].start < nextStart) nextStart = subs[i].start;
        }
        // Also check all subs for true overlap and clamp
        for (let i = 0; i < subs.length; i++) {
            if (i === excludeIndex) continue;
            // If our range overlaps this sub, clamp
            if (s < subs[i].end && e > subs[i].start) {
                // Decide which side to clamp to based on which is closer
                const overlapLeft = subs[i].end - s;
                const overlapRight = e - subs[i].start;
                if (overlapLeft < overlapRight) {
                    s = subs[i].end;
                    e = s + dur;
                } else {
                    e = subs[i].start;
                    s = e - dur;
                }
            }
        }
        s = Math.max(0, s);
        if (duration) e = Math.min(duration, e);
        return [s, e];
    }, [duration]);

    // Get DOM node for a subtitle block by index
    const getSubNode = useCallback((index) => {
        const timeline = timelineRef.current;
        if (!timeline) return null;
        return timeline.querySelector(`[data-sub-idx="${index}"]`);
    }, []);

    // Apply position to DOM directly (no React re-render)
    const applyDomPosition = useCallback((index, start, end) => {
        const node = getSubNode(index);
        if (!node) return;
        const pps = ppsRef.current;
        node.style.left = `${start * pps}px`;
        node.style.width = `${(end - start) * pps}px`;
    }, [getSubNode]);

    // --- DRAG: subtitle blocks (move / resize) ---
    const handleMouseDown = useCallback((index, type, e) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedIndex(index);
        const sub = subtitlesRef.current[index];
        dragRef.current = {
            index,
            type,
            initialX: e.clientX,
            origStart: sub.start,
            origEnd: sub.end,
            lastStart: sub.start,
            lastEnd: sub.end,
        };
        // Add dragging class to disable CSS transitions
        const node = getSubNode(index);
        if (node) node.style.transition = 'none';
    }, [getSubNode]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            const drag = dragRef.current;
            if (!drag) return;

            const pps = ppsRef.current;
            const deltaTime = (e.clientX - drag.initialX) / pps;
            const subs = subtitlesRef.current;
            const subDur = drag.origEnd - drag.origStart;
            let newStart, newEnd;

            if (drag.type === 'move') {
                newStart = Math.max(0, drag.origStart + deltaTime);
                newStart = snapTo(newStart, drag.index, subs);
                newEnd = newStart + subDur;
                const snappedEnd = snapTo(newEnd, drag.index, subs);
                if (snappedEnd !== newEnd) {
                    newEnd = snappedEnd;
                    newStart = newEnd - subDur;
                }
                // Clamp to prevent overlap
                [newStart, newEnd] = clampNoOverlap(newStart, newEnd, drag.index, subs);
            } else if (drag.type === 'start') {
                newStart = Math.max(0, drag.origStart + deltaTime);
                newStart = snapTo(newStart, drag.index, subs);
                newEnd = drag.origEnd;
                // Min duration 0.1s
                if (newStart >= newEnd - 0.1) newStart = newEnd - 0.1;
                // Prevent overlap with previous
                for (let i = 0; i < subs.length; i++) {
                    if (i === drag.index) continue;
                    if (subs[i].end > newStart && subs[i].start < newEnd) {
                        newStart = Math.max(newStart, subs[i].end);
                    }
                }
                if (newStart >= newEnd - 0.1) newStart = newEnd - 0.1;
            } else if (drag.type === 'end') {
                newEnd = Math.max(drag.origStart + 0.1, drag.origEnd + deltaTime);
                if (duration) newEnd = Math.min(duration, newEnd);
                newEnd = snapTo(newEnd, drag.index, subs);
                newStart = drag.origStart;
                // Min duration 0.1s
                if (newEnd <= newStart + 0.1) newEnd = newStart + 0.1;
                // Prevent overlap with next
                for (let i = 0; i < subs.length; i++) {
                    if (i === drag.index) continue;
                    if (subs[i].start < newEnd && subs[i].end > newStart) {
                        newEnd = Math.min(newEnd, subs[i].start);
                    }
                }
                if (newEnd <= newStart + 0.1) newEnd = newStart + 0.1;
            }

            drag.lastStart = newStart;
            drag.lastEnd = newEnd;

            // Direct DOM update — no React re-render
            applyDomPosition(drag.index, newStart, newEnd);
        };

        const handleMouseUp = () => {
            const drag = dragRef.current;
            if (!drag) return;

            // Restore CSS transitions
            const node = getSubNode(drag.index);
            if (node) node.style.transition = '';

            // Final overlap prevention before committing
            const subs = [...subtitlesRef.current];
            let finalStart = Math.round(drag.lastStart * 1000) / 1000;
            let finalEnd = Math.round(drag.lastEnd * 1000) / 1000;
            [finalStart, finalEnd] = clampNoOverlap(finalStart, finalEnd, drag.index, subs);

            subs[drag.index] = {
                ...subs[drag.index],
                start: finalStart,
                end: finalEnd,
            };
            dragRef.current = null;
            onUpdateSubtitles(subs);
            setRenderTick(t => t + 1);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [duration, snapTo, clampNoOverlap, applyDomPosition, getSubNode, onUpdateSubtitles]);

    // --- Playhead drag — direct DOM + rAF throttled seek ---
    useEffect(() => {
        if (!isDraggingPlayhead) return;

        const handleMouseMove = (e) => {
            if (!timelineRef.current) return;
            const rect = timelineRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
            let time = Math.max(0, Math.min(duration, x / ppsRef.current));
            time = snapPlayhead(time);
            dragTimeRef.current = time;

            if (playheadRef.current) {
                playheadRef.current.style.left = `${time * ppsRef.current - 7}px`;
            }

            if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(() => {
                    if (dragTimeRef.current !== null) onSeek(dragTimeRef.current);
                    rafRef.current = null;
                });
            }
        };

        const handleMouseUp = () => {
            if (dragTimeRef.current !== null) {
                onSeek(dragTimeRef.current);
                dragTimeRef.current = null;
            }
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            setIsDraggingPlayhead(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        };
    }, [isDraggingPlayhead, duration, onSeek, snapPlayhead]);

    // Zoom (Cmd/Ctrl + scroll)
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
                const playheadViewportX = ct * oldPps - el.scrollLeft;
                setPixelsPerSecond(newPps);
                ppsRef.current = newPps;
                requestAnimationFrame(() => { el.scrollLeft = ct * newPps - playheadViewportX; });
            }
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    // Keyboard: copy/paste/delete
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedIndex === null) return;
            if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
                e.preventDefault();
                setClipboard({ ...subtitles[selectedIndex] });
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) {
                e.preventDefault();
                const lastEnd = subtitles.reduce((max, sub) => Math.max(max, sub.end), 0);
                const subDuration = clipboard.end - clipboard.start;
                const newSub = { ...clipboard, start: lastEnd + 0.1, end: lastEnd + 0.1 + subDuration };
                onUpdateSubtitles([...subtitles, newSub]);
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                onUpdateSubtitles(subtitles.filter((_, idx) => idx !== selectedIndex));
                setSelectedIndex(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, clipboard, subtitles, onUpdateSubtitles]);

    const playheadLeft = (isDraggingPlayhead && dragTimeRef.current !== null)
        ? dragTimeRef.current * pixelsPerSecond - 7
        : (currentTime || 0) * pixelsPerSecond - 7;

    const timelineWidth = Math.max(typeof window !== 'undefined' ? window.innerWidth : 1000, (duration || 0) * pixelsPerSecond);

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
                    if (e.target !== e.currentTarget && !e.target.classList.contains('timeline-bg')) return;
                    if (!timelineRef.current) return;
                    const rect = timelineRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
                    const time = Math.max(0, Math.min(duration, x / pixelsPerSecond));
                    onSeek(time);
                    setIsDraggingPlayhead(true);
                    setSelectedIndex(null);
                    if (playheadRef.current) playheadRef.current.style.left = `${time * pixelsPerSecond - 7}px`;
                }}
                style={{ cursor: 'crosshair' }}
            >
                {/* Time Markers */}
                <div className="absolute top-0 left-0 h-6 flex border-b border-gray-800 timeline-bg" style={{ width: timelineWidth }}>
                    {Array.from({ length: Math.ceil(duration || 0) + 1 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute border-l border-gray-800/60 h-full text-[9px] text-gray-500 pl-1 pt-1 timeline-bg"
                            style={{ left: i * pixelsPerSecond }}
                        >
                            {i}s
                        </div>
                    ))}
                    {Array.from({ length: Math.ceil(duration || 0) * 2 + 1 }).map((_, i) => {
                        if (i % 2 === 0) return null;
                        return (
                            <div
                                key={`m${i}`}
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
                            data-sub-idx={index}
                            className={`absolute h-10 rounded-lg group
                                ${selectedIndex === index
                                    ? 'bg-gradient-to-r from-blue-600/80 to-cyan-600/80 border border-cyan-400/60 text-white z-20 shadow-lg shadow-cyan-500/20'
                                    : currentTime >= sub.start && currentTime <= sub.end
                                        ? 'bg-gradient-to-r from-violet-600/70 to-purple-600/70 border border-violet-400/40 text-white z-10 shadow-md shadow-violet-500/15'
                                        : 'bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:bg-gray-700/60 hover:border-gray-600/50 hover:text-gray-300'
                                } flex flex-col items-center justify-center text-[10px] px-2 truncate overflow-hidden cursor-move`}
                            style={{
                                left: sub.start * pixelsPerSecond,
                                width: (sub.end - sub.start) * pixelsPerSecond,
                                willChange: 'left, width',
                            }}
                            onMouseDown={(e) => handleMouseDown(index, 'move', e)}
                        >
                            {/* Left resize handle */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-lg
                                    bg-white/0 hover:bg-white/30 group-hover:bg-white/10 z-20"
                                onMouseDown={(e) => handleMouseDown(index, 'start', e)}
                            />
                            {/* Right resize handle */}
                            <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-lg
                                    bg-white/0 hover:bg-white/30 group-hover:bg-white/10 z-20"
                                onMouseDown={(e) => handleMouseDown(index, 'end', e)}
                            />
                            <span className="truncate w-full text-center font-medium text-[10px] leading-tight pointer-events-none">{sub.text}</span>
                            <span className="text-[8px] opacity-50 font-mono pointer-events-none">{(sub.end - sub.start).toFixed(1)}s</span>
                        </div>
                    ))}
                </div>

                {/* Playhead */}
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
