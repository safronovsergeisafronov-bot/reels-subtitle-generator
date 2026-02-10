import React, { useEffect, useState, useRef } from 'react';
import { Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { WS_URL as defaultWsUrl } from '../api/client';

const ExportModal = ({ isOpen, progress: externalProgress, onCancel, taskId, wsUrl = defaultWsUrl }) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Encoding...');
    const [phase, setPhase] = useState('encoding');
    const [wsConnected, setWsConnected] = useState(false);
    const wsRef = useRef(null);
    const fallbackTimerRef = useRef(null);
    const modalRef = useRef(null);
    const previousFocusRef = useRef(null);

    const startFallbackProgress = () => {
        let simProgress = 0;
        fallbackTimerRef.current = setInterval(() => {
            simProgress += Math.random() * 3 + 1;
            if (simProgress >= 95) {
                simProgress = 95;
                clearInterval(fallbackTimerRef.current);
            }
            setProgress(Math.min(Math.round(simProgress), 95));
            if (simProgress >= 80) {
                setStatus('Finalizing...');
                setPhase('finalizing');
            }
        }, 500);
    };

    useEffect(() => {
        if (!isOpen) {
            setProgress(0);
            setStatus('Encoding...');
            setPhase('encoding');
            setWsConnected(false);
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

    // Focus management: trap focus, handle Escape, restore focus on close
    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement;
            // Focus the modal after render
            requestAnimationFrame(() => {
                if (modalRef.current) {
                    const firstFocusable = modalRef.current.querySelector('button');
                    if (firstFocusable) firstFocusable.focus();
                }
            });
        } else if (previousFocusRef.current) {
            previousFocusRef.current.focus();
            previousFocusRef.current = null;
        }
    }, [isOpen]);

    // Escape key to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onCancel();
            }
            // Trap focus within modal
            if (e.key === 'Tab' && modalRef.current) {
                const focusable = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const phaseSteps = [
        { key: 'encoding', label: 'Encoding' },
        { key: 'finalizing', label: 'Finalizing' },
        { key: 'complete', label: 'Complete' },
    ];

    const currentPhaseIndex = phaseSteps.findIndex(s => s.key === phase);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 modal-overlay" role="dialog" aria-modal="true" aria-label="Exporting video">
            <div ref={modalRef} className="bg-gray-900 rounded-2xl p-6 md:p-8 w-full max-w-sm mx-4 border border-gray-700 shadow-2xl modal-content">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Exporting Video</h2>
                    <button
                        onClick={onCancel}
                        className="text-gray-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                        aria-label="Cancel export"
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
                                <span className={`text-[10px] font-medium ${isDone ? 'text-green-400' : isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
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
                    <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Export progress">
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
