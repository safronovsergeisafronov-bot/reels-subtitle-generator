import React, { useEffect, useState, useRef } from 'react';
import { Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';

const _defaultWsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

const ExportModal = ({ isOpen, progress: externalProgress, onCancel, taskId, wsUrl = _defaultWsUrl }) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Encoding...');
    const [phase, setPhase] = useState('encoding');
    const [wsConnected, setWsConnected] = useState(false);
    const [error, setError] = useState(null);
    const wsRef = useRef(null);
    const fallbackTimerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            setProgress(0);
            setStatus('Encoding...');
            setPhase('encoding');
            setWsConnected(false);
            setError(null);
            return;
        }

        // Try WebSocket connection if taskId is provided
        if (taskId) {
            try {
                const ws = new WebSocket(`${wsUrl}/ws/export-progress/${taskId}`);
                wsRef.current = ws;

                ws.onopen = () => {
                    setWsConnected(true);
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.progress !== undefined) {
                            setProgress(data.progress);
                        }
                        if (data.status) {
                            setStatus(data.status);
                            // Derive phase from status
                            if (data.status.toLowerCase().includes('encod')) {
                                setPhase('encoding');
                            } else if (data.status.toLowerCase().includes('final')) {
                                setPhase('finalizing');
                            } else if (data.status.toLowerCase().includes('complete')) {
                                setPhase('complete');
                            }
                        }
                    } catch {
                        // Ignore parse errors
                    }
                };

                ws.onerror = () => {
                    setWsConnected(false);
                    startFallbackProgress();
                };

                ws.onclose = () => {
                    setWsConnected(false);
                };

                return () => {
                    ws.close();
                    wsRef.current = null;
                    if (fallbackTimerRef.current) {
                        clearInterval(fallbackTimerRef.current);
                    }
                };
            } catch {
                startFallbackProgress();
            }
        } else {
            // No taskId, use external progress or simulated
            if (externalProgress !== undefined) {
                setProgress(externalProgress);
                if (externalProgress >= 100) {
                    setStatus('Complete!');
                    setPhase('complete');
                } else if (externalProgress >= 80) {
                    setStatus('Finalizing...');
                    setPhase('finalizing');
                } else {
                    setStatus('Encoding...');
                    setPhase('encoding');
                }
            } else {
                startFallbackProgress();
            }
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (fallbackTimerRef.current) {
                clearInterval(fallbackTimerRef.current);
            }
        };
    }, [isOpen, taskId, wsUrl]);

    // Keep external progress in sync when no WS
    useEffect(() => {
        if (!wsConnected && externalProgress !== undefined && isOpen) {
            setProgress(externalProgress);
            if (externalProgress >= 100) {
                setStatus('Complete!');
                setPhase('complete');
            } else if (externalProgress >= 80) {
                setStatus('Finalizing...');
                setPhase('finalizing');
            } else {
                setStatus('Encoding...');
                setPhase('encoding');
            }
        }
    }, [externalProgress, wsConnected, isOpen]);

    const startFallbackProgress = () => {
        let simProgress = 0;
        fallbackTimerRef.current = setInterval(() => {
            simProgress += Math.random() * 3 + 1;
            if (simProgress >= 95) {
                simProgress = 95; // Cap at 95 for simulated
                clearInterval(fallbackTimerRef.current);
            }
            setProgress(Math.min(Math.round(simProgress), 95));
            if (simProgress >= 80) {
                setStatus('Finalizing...');
                setPhase('finalizing');
            }
        }, 500);
    };

    if (!isOpen) return null;

    const phaseSteps = [
        { key: 'encoding', label: 'Encoding' },
        { key: 'finalizing', label: 'Finalizing' },
        { key: 'complete', label: 'Complete' },
    ];

    const currentPhaseIndex = phaseSteps.findIndex(s => s.key === phase);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 modal-overlay">
            <div className="bg-gray-900 rounded-2xl p-8 w-96 border border-gray-700 shadow-2xl modal-content">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Exporting Video</h2>
                    <button
                        onClick={onCancel}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Phase Indicator */}
                <div className="flex items-center justify-between mb-4">
                    {phaseSteps.map((step, idx) => {
                        const isActive = idx === currentPhaseIndex;
                        const isDone = idx < currentPhaseIndex;
                        return (
                            <div key={step.key} className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${isDone ? 'bg-green-500' : isActive ? 'bg-cyan-400' : 'bg-gray-600'}`} />
                                <span className={`text-[10px] font-medium ${isDone ? 'text-green-400' : isActive ? 'text-cyan-400' : 'text-gray-600'}`}>
                                    {step.label}
                                </span>
                                {idx < phaseSteps.length - 1 && (
                                    <div className={`w-8 h-px mx-1 ${isDone ? 'bg-green-500' : 'bg-gray-700'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">{status}</span>
                        <span className="text-cyan-400 font-bold">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                    {phase === 'complete' ? (
                        <>
                            <CheckCircle size={16} className="text-green-400" />
                            <span className="text-green-400">Export complete!</span>
                        </>
                    ) : (
                        <>
                            <Loader2 className="animate-spin" size={16} />
                            <span>Please wait...</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
