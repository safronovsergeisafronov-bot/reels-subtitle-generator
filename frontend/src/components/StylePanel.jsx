import React, { useState } from 'react';
import { Type, Star, Check, Palette } from 'lucide-react';
import { stylePresets } from '../data/stylePresets';
import { API_URL } from '../api/client';

const StylePanel = ({ styles, onUpdateStyles, fontList, onApplyPreset, videoDimensions }) => {
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem('favoriteFonts');
        return saved ? JSON.parse(saved) : [];
    });

    const toggleFavorite = (fontName) => {
        let newFavs;
        if (favorites.includes(fontName)) {
            newFavs = favorites.filter(f => f !== fontName);
        } else {
            newFavs = [...favorites, fontName];
        }
        setFavorites(newFavs);
        localStorage.setItem('favoriteFonts', JSON.stringify(newFavs));
    };

    const sortedFonts = [...fontList].sort((a, b) => {
        const aFav = favorites.includes(a.name);
        const bFav = favorites.includes(b.name);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.name.localeCompare(b.name);
    });

    const handleApplyPreset = (preset) => {
        const mapped = {
            fontFamily: preset.fontFamily,
            fontSize: preset.fontSize,
            textColor: preset.color,
            uppercase: preset.uppercase,
        };
        if (preset.outlineWidth !== undefined) mapped.outlineWidth = preset.outlineWidth;
        if (preset.outlineColor !== undefined) mapped.outlineColor = preset.outlineColor;
        if (preset.shadowDepth !== undefined) mapped.shadowDepth = preset.shadowDepth;
        if (preset.bold !== undefined) mapped.bold = preset.bold;
        if (preset.position) mapped.position = preset.position;
        if (onApplyPreset) {
            onApplyPreset(mapped);
        } else {
            onUpdateStyles({ ...styles, ...mapped });
        }
    };

    return (
        <div className="bg-gray-900 border-l border-gray-800 p-3 w-full flex flex-col gap-4 overflow-y-auto h-full">
            <div>
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                    <Type size={18} /> Style Settings
                </h3>

                {/* Presets Section */}
                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2 flex items-center gap-1">
                        <Palette size={12} />
                        PRESETS
                    </label>
                    <div className="flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
                        {(stylePresets || []).map((preset) => (
                            <button
                                key={preset.name}
                                className="flex-shrink-0 w-24 bg-zinc-800 hover:bg-zinc-700 rounded-lg p-2 cursor-pointer transition-colors border border-zinc-700 hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-left"
                                onClick={() => handleApplyPreset(preset)}
                                aria-label={`Apply preset: ${preset.name}`}
                            >
                                <div
                                    className="text-xs font-bold mb-1 truncate text-center"
                                    style={{
                                        color: preset.color || '#FFFFFF',
                                        fontFamily: preset.fontFamily || 'inherit',
                                        textTransform: preset.uppercase ? 'uppercase' : 'none',
                                    }}
                                >
                                    {preset.preview || 'Sample'}
                                </div>
                                <div className="text-[10px] text-white font-medium text-center truncate">
                                    {preset.name}
                                </div>
                                <div className="text-[9px] text-gray-500 text-center truncate mt-0.5">
                                    {preset.description}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2">FONT FAMILY</label>
                    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 max-h-48 overflow-y-auto">
                        {sortedFonts.map((font) => (
                            <div
                                key={font.name}
                                className={`flex items-center justify-between p-1.5 cursor-pointer hover:bg-gray-700 transition-colors ${styles.fontFamily === font.name ? 'bg-blue-900/40' : ''}`}
                                onClick={() => onUpdateStyles({ ...styles, fontFamily: font.name })}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {styles.fontFamily === font.name && <Check size={14} className="text-blue-400" />}
                                    <span
                                        className="text-white text-sm truncate"
                                        style={{ fontFamily: font.name }}
                                    >
                                        {font.name}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(font.name);
                                    }}
                                    className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ${favorites.includes(font.name) ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                                    aria-label={favorites.includes(font.name) ? `Remove ${font.name} from favorites` : `Add ${font.name} to favorites`}
                                    aria-pressed={favorites.includes(font.name)}
                                >
                                    <Star size={14} fill={favorites.includes(font.name) ? "currentColor" : "none"} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2" id="font-size-label">FONT SIZE ({styles.fontSize}px)</label>
                    <input
                        type="range"
                        min="20"
                        max="200"
                        value={styles.fontSize}
                        onChange={(e) => onUpdateStyles({ ...styles, fontSize: parseInt(e.target.value) })}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        aria-labelledby="font-size-label"
                        aria-valuemin={20}
                        aria-valuemax={200}
                        aria-valuenow={styles.fontSize}
                    />
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2">TEXT COLOR</label>
                    <div className="flex gap-2">
                        {['#FFFFFF', '#FFFF00', '#00FFFF', '#FF00FF', '#FF0000', '#00FF00'].map(color => (
                            <button
                                key={color}
                                className={`w-6 h-6 rounded-full cursor-pointer ring-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 ${styles.textColor === color ? 'ring-blue-500' : 'ring-transparent'}`}
                                style={{ backgroundColor: color }}
                                onClick={() => onUpdateStyles({ ...styles, textColor: color })}
                                aria-label={`Text color: ${color}`}
                                aria-pressed={styles.textColor === color}
                            />
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2">CAPS LOCK</label>
                    <button
                        onClick={() => onUpdateStyles({ ...styles, uppercase: !styles.uppercase })}
                        className={`px-4 py-2 rounded text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${styles.uppercase ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                        aria-label="Toggle uppercase"
                        aria-pressed={styles.uppercase}
                    >
                        {styles.uppercase ? 'ON' : 'OFF'}
                    </button>
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2">KARAOKE HIGHLIGHTING</label>
                    <button
                        onClick={() => onUpdateStyles({ ...styles, karaokeEnabled: !styles.karaokeEnabled })}
                        className={`px-4 py-2 rounded text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${styles.karaokeEnabled ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                        aria-label="Toggle karaoke highlighting"
                        aria-pressed={styles.karaokeEnabled}
                    >
                        {styles.karaokeEnabled ? 'ON' : 'OFF'}
                    </button>
                    {styles.karaokeEnabled && (
                        <div className="mt-2">
                            <label className="text-[10px] text-gray-500 block mb-1">HIGHLIGHT COLOR</label>
                            <div className="flex gap-2 items-center">
                                {['#FFFF00', '#00FFFF', '#FF00FF', '#FF0000', '#00FF00', '#FFA500'].map(color => (
                                    <button
                                        key={color}
                                        className={`w-6 h-6 rounded-full cursor-pointer ring-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 ${styles.highlightColor === color ? 'ring-blue-500' : 'ring-transparent'}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => onUpdateStyles({ ...styles, highlightColor: color })}
                                        aria-label={`Highlight color: ${color}`}
                                        aria-pressed={styles.highlightColor === color}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={styles.highlightColor || '#FFFF00'}
                                    onChange={(e) => onUpdateStyles({ ...styles, highlightColor: e.target.value })}
                                    className="w-6 h-6 rounded cursor-pointer bg-transparent border border-gray-600"
                                    title="Custom highlight color"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2">POSITION (px from center)</label>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 block mb-1">X px</label>
                            <input
                                type="number"
                                step="1"
                                value={Math.round(styles.position?.x ?? 0)}
                                onChange={(e) => onUpdateStyles({
                                    ...styles,
                                    position: { ...styles.position, x: parseInt(e.target.value) || 0 }
                                })}
                                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 block mb-1">Y px</label>
                            <input
                                type="number"
                                step="1"
                                value={Math.round(styles.position?.y ?? -800)}
                                onChange={(e) => onUpdateStyles({
                                    ...styles,
                                    position: { ...styles.position, y: parseInt(e.target.value) || 0 }
                                })}
                                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                            />
                        </div>
                    </div>
                    {videoDimensions && (
                        <div className="text-[9px] text-gray-500 mt-1">
                            Video: {videoDimensions.width}×{videoDimensions.height} | Center: 0,0 | Bottom: 0,{-Math.round(videoDimensions.height / 2)}
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2" id="outline-label">OUTLINE ({styles.outlineWidth ?? 2})</label>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={styles.outlineWidth ?? 2}
                        onChange={(e) => onUpdateStyles({ ...styles, outlineWidth: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        aria-labelledby="outline-label"
                        aria-valuenow={styles.outlineWidth ?? 2}
                    />
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2" id="shadow-label">SHADOW ({styles.shadowDepth ?? 2})</label>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={styles.shadowDepth ?? 2}
                        onChange={(e) => onUpdateStyles({ ...styles, shadowDepth: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        aria-labelledby="shadow-label"
                        aria-valuenow={styles.shadowDepth ?? 2}
                    />
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-800">
                <p className="text-[10px] text-gray-500 italic">
                    Note: System fonts are loaded from your macOS Library.
                </p>
            </div>
        </div>
    );
};

export default StylePanel;
