import React from 'react';
import { Loader2, X } from 'lucide-react';

const ExportModal = ({ isOpen, progress, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl p-8 w-96 border border-gray-700 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Exporting Video</h2>
                    <button
                        onClick={onCancel}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Burning subtitles...</span>
                        <span className="text-cyan-400 font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Please wait...</span>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
