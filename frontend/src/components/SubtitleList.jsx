import React, { useEffect, useRef, useState } from 'react';
import { Copy, Clock, Download, Edit2, Save, Check, Scissors, Merge } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper to format seconds to MM:SS.ms
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10); // 1 decimal place
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
};

// Helper to generate SRT content
const generateSRT = (subtitles) => {
    return subtitles.map((sub, index) => {
        const start = formatSRTTime(sub.start);
        const end = formatSRTTime(sub.end);
        return `${index + 1}\n${start} --> ${end}\n${sub.text}\n`;
    }).join('\n');
};

const formatSRTTime = (seconds) => {
    const date = new Date(0);
    date.setMilliseconds(seconds * 1000);
    const isoString = date.toISOString().substr(11, 12);
    return isoString.replace('.', ',');
};

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const CharCount = ({ count }) => {
    let colorClass = 'text-gray-600';
    if (count > 30) {
        colorClass = 'text-red-400';
    } else if (count > 20) {
        colorClass = 'text-yellow-400';
    }
    return (
        <span className={`text-[10px] ${colorClass}`}>
            {count} chars
        </span>
    );
};

const SubtitleList = ({ subtitles, currentTime, onSeek, onUpdateSubtitle }) => {
    const activeRef = useRef(null);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");
    const [copiedId, setCopiedId] = useState(null);
    const textareaRef = useRef(null);

    // Auto-scroll to active subtitle
    useEffect(() => {
        if (activeRef.current && editingId === null) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [subtitles, currentTime, editingId]);

    const handleCopy = (id, text) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleEditStart = (index, text) => {
        setEditingId(index);
        setEditText(text);
    };

    const handleSave = (index) => {
        const updated = [...subtitles];
        updated[index].text = editText;
        onUpdateSubtitle(updated);
        setEditingId(null);
    };

    const handleSplit = (index) => {
        const sub = subtitles[index];
        const text = sub.text;
        // Use cursor position from textarea if editing, otherwise split at middle
        let splitPos = Math.floor(text.length / 2);
        if (editingId === index && textareaRef.current) {
            splitPos = textareaRef.current.selectionStart || splitPos;
        }

        if (splitPos <= 0 || splitPos >= text.length) return;

        const midTime = (sub.start + sub.end) / 2;
        const firstHalf = {
            ...sub,
            text: text.slice(0, splitPos).trim(),
            end: midTime,
        };
        const secondHalf = {
            ...sub,
            text: text.slice(splitPos).trim(),
            start: midTime,
        };

        const updated = [...subtitles];
        updated.splice(index, 1, firstHalf, secondHalf);
        onUpdateSubtitle(updated);
        setEditingId(null);
    };

    const handleMerge = (index) => {
        if (index >= subtitles.length - 1) return;
        const current = subtitles[index];
        const next = subtitles[index + 1];
        const merged = {
            ...current,
            text: current.text + ' ' + next.text,
            end: next.end,
        };
        const updated = [...subtitles];
        updated.splice(index, 2, merged);
        onUpdateSubtitle(updated);
    };

    const handleDownloadSRT = () => {
        const srtContent = generateSRT(subtitles);
        const blob = new Blob([srtContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'subtitles.srt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full bg-gray-900/50">
            {/* Toolbar */}
            {subtitles.length > 0 && (
                <div className="p-2 border-b border-gray-800 flex justify-end">
                    <button
                        onClick={handleDownloadSRT}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    >
                        <Download size={14} />
                        Download .srt
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {subtitles.map((sub, index) => {
                    const isActive = currentTime >= sub.start && currentTime <= sub.end;
                    const isEditing = editingId === index;
                    const isCopied = copiedId === index;

                    return (
                        <div
                            key={index}
                            ref={isActive ? activeRef : null}
                            className={cn(
                                "subtitle-item group relative p-2 rounded-lg border",
                                isActive
                                    ? "bg-indigo-900/30 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                    : "bg-gray-800 border-gray-700 hover:border-gray-600"
                            )}
                        >
                            {/* Header: Time & Copy */}
                            <div className="flex justify-between items-center mb-2 text-xs text-gray-400">
                                <div
                                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-400 transition-colors"
                                    onClick={() => onSeek(sub.start)}
                                >
                                    <Clock size={12} />
                                    <span>{formatTime(sub.start)} - {formatTime(sub.end)}</span>
                                </div>

                                {isCopied ? (
                                    <div className="flex items-center gap-1 text-green-400 bg-green-400/10 px-2 py-0.5 rounded text-[10px] font-medium animate-in fade-in zoom-in duration-200">
                                        <Check size={12} />
                                        <span>Copied</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleCopy(index, sub.text)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                                        title="Copy text"
                                    >
                                        <Copy size={14} className="text-gray-300" />
                                    </button>
                                )}
                            </div>

                            {/* Text Content */}
                            {isEditing ? (
                                <div className="space-y-2">
                                    <textarea
                                        ref={textareaRef}
                                        className="w-full bg-gray-900/50 border border-gray-600 rounded p-2 text-sm text-white resize-none outline-none focus:border-indigo-500 transition-colors"
                                        rows={3}
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex justify-between items-center">
                                        <CharCount count={editText.length} />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSplit(index)}
                                                className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                                                title="Split subtitle at cursor position"
                                            >
                                                <Scissors size={12} />
                                                Split
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleSave(index)}
                                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                            >
                                                <Save size={12} />
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className={cn(
                                        "text-sm font-medium leading-relaxed mb-2 whitespace-pre-wrap",
                                        isActive ? "text-white" : "text-gray-300"
                                    )}>
                                        {sub.text}
                                    </p>
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEditStart(index, sub.text)}
                                                className="flex items-center gap-1 text-gray-500 hover:text-indigo-400 text-xs transition-colors px-2 py-1 rounded hover:bg-gray-700/50"
                                            >
                                                <Edit2 size={12} />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleSplit(index)}
                                                className="flex items-center gap-1 text-gray-500 hover:text-amber-400 text-xs transition-colors px-2 py-1 rounded hover:bg-gray-700/50"
                                                title="Split at middle"
                                            >
                                                <Scissors size={12} />
                                                Split
                                            </button>
                                            {index < subtitles.length - 1 && (
                                                <button
                                                    onClick={() => handleMerge(index)}
                                                    className="flex items-center gap-1 text-gray-500 hover:text-cyan-400 text-xs transition-colors px-2 py-1 rounded hover:bg-gray-700/50"
                                                    title="Merge with next subtitle"
                                                >
                                                    <Merge size={12} />
                                                    Merge
                                                </button>
                                            )}
                                        </div>
                                        <CharCount count={sub.text.length} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {subtitles.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        No subtitles yet. Upload a video to start.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubtitleList;
