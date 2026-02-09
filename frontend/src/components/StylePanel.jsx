import React, { useState, useEffect } from 'react';
import { Type, Star, Check, Palette } from 'lucide-react';
import { stylePresets } from '../data/stylePresets';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const StylePanel = ({ styles, onUpdateStyles, fontList, onApplyPreset }) => {
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
                            <div
                                key={preset.name}
                                className="flex-shrink-0 w-24 bg-zinc-800 hover:bg-zinc-700 rounded-lg p-2 cursor-pointer transition-colors border border-zinc-700 hover:border-zinc-500"
                                onClick={() => handleApplyPreset(preset)}
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
                            </div>
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
                                    className={`transition-colors ${favorites.includes(font.name) ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    <Star size={14} fill={favorites.includes(font.name) ? "currentColor" : "none"} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2">FONT SIZE ({styles.fontSize}px)</label>
                    <input
                        type="range"
                        min="12"
                        max="80"
                        value={styles.fontSize}
                        onChange={(e) => onUpdateStyles({ ...styles, fontSize: parseInt(e.target.value) })}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2">TEXT COLOR</label>
                    <div className="flex gap-2">
                        {['#FFFFFF', '#FFFF00', '#00FFFF', '#FF00FF', '#FF0000', '#00FF00'].map(color => (
                            <div
                                key={color}
                                className={`w-6 h-6 rounded-full cursor-pointer ring-2 ${styles.textColor === color ? 'ring-blue-500' : 'ring-transparent'}`}
                                style={{ backgroundColor: color }}
                                onClick={() => onUpdateStyles({ ...styles, textColor: color })}
                            />
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2">CAPS LOCK</label>
                    <button
                        onClick={() => onUpdateStyles({ ...styles, uppercase: !styles.uppercase })}
                        className={`px-4 py-2 rounded text-xs font-bold transition-all ${styles.uppercase ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                    >
                        {styles.uppercase ? 'ON' : 'OFF'}
                    </button>
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
