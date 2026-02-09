import React, { useState, useRef, useEffect, useCallback } from 'react';
import VideoPlayer from './components/VideoPlayer';
import SubtitleList from './components/SubtitleList';
import StylePanel from './components/StylePanel';
import Timeline from './components/Timeline';
import VideoControls from './components/VideoControls';
import ExportModal from './components/ExportModal';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import LanguageSelector from './components/LanguageSelector';
import { ToastProvider, useToast } from './components/Toast';
import { useHistory } from './hooks/useHistory';
import { useAutoSave, loadAutoSave } from './hooks/useAutoSave';
import { Upload, Loader2, Sparkles, Type, List, Undo2, Redo2, Wand2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000";

function AppContent() {
  const { toast } = useToast();

  const [videoSrc, setVideoSrc] = useState(null);
  const [currentFilename, setCurrentFilename] = useState(null);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState('subtitles');
  const [isPlaying, setIsPlaying] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(66.66);
  const [isResizing, setIsResizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportTaskId, setExportTaskId] = useState(null);
  const [language, setLanguage] = useState('auto');
  const videoRef = useRef(null);

  // Video controls state
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Undo/redo for subtitles
  const { state: subtitles, set: setSubtitles, undo, redo, canUndo, canRedo } = useHistory([]);

  // Fonts & styles
  const [fonts, setFonts] = useState([]);
  const [subtitleStyles, setSubtitleStyles] = useState(() => {
    const saved = loadAutoSave('subtitle-styles');
    return saved || {
      fontFamily: "Inter",
      fontSize: 28,
      textColor: "#FFFFFF",
      uppercase: false,
      position: { x: 50, y: 80 }
    };
  });

  // Auto-save subtitles and styles
  useAutoSave('subtitle-data', subtitles.length > 0 ? { subtitles, filename: currentFilename } : null);
  useAutoSave('subtitle-styles', subtitleStyles);

  // Fetch fonts and inject into document (once)
  useEffect(() => {
    const existing = document.getElementById('dynamic-fonts');
    if (existing) return;

    const fetchFonts = async () => {
      try {
        const res = await fetch(`${API_URL}/fonts`);
        const data = await res.json();
        setFonts(data.fonts);

        const style = document.createElement('style');
        style.id = 'dynamic-fonts';
        let css = '';
        data.fonts.forEach(font => {
          css += `@font-face { font-family: '${font.name}'; src: url('${API_URL}/font-file/${font.filename}'); }\n`;
        });
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
      } catch (err) {
        console.error("Failed to fetch fonts:", err);
      }
    };
    fetchFonts();
  }, []);

  // Video play/pause event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoSrc]);

  // Keyboard shortcuts: undo/redo, space to play/pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      // Space: play/pause
      if (e.key === ' ' && videoRef.current) {
        e.preventDefault();
        if (isPlaying) videoRef.current.pause();
        else videoRef.current.play();
      }

      // Ctrl/Cmd + Z: undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
          toast({ type: 'info', message: 'Undo' });
        }
      }

      // Ctrl/Cmd + Shift + Z: redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canRedo) {
          redo();
          toast({ type: 'info', message: 'Redo' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, canUndo, canRedo, undo, redo, toast]);

  const handleTimeUpdate = (e) => setCurrentTime(e.target.currentTime);
  const handleLoadedMetadata = (e) => setDuration(e.target.duration);

  const handleSeek = (time) => {
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const handleFullscreen = () => {
    const container = document.getElementById('video-container');
    if (container) {
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
    }
  };

  const handlePlaybackRateChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  const handleVolumeChange = (val) => {
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) videoRef.current.muted = newMuted;
  };

  // Panel resize
  const handleResizeStart = () => setIsResizing(true);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      setLeftPanelWidth(Math.max(30, Math.min(80, newWidth)));
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Drag-and-drop
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  };
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "video/mp4" || file.type === "video/quicktime")) {
      processFile(file);
    }
  };

  // --- Upload file only ---
  const processFile = async (file) => {
    if (!file) return;
    setVideoSrc(URL.createObjectURL(file));
    setLoading(true);
    setLoadingMessage('Uploading...');

    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
      }
      const { filename } = await uploadRes.json();
      setCurrentFilename(filename);
      toast({ type: 'success', message: 'Video uploaded. Click "Generate Subtitles" to transcribe.' });
    } catch (error) {
      console.error(error);
      toast({ type: 'error', message: error.message || "Upload failed" });
    } finally {
      setLoading(false);
      setLoadingMessage('Processing...');
    }
  };

  // --- Generate subtitles via WebSocket ---
  const generateSubtitles = async () => {
    if (!currentFilename) return;
    setLoading(true);
    setLoadingMessage('Transcribing audio...');

    try {
      const processRes = await fetch(`${API_URL}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: currentFilename,
          language: language === 'auto' ? null : language,
        }),
      });
      if (!processRes.ok) throw new Error("Processing failed");
      const { task_id } = await processRes.json();

      await new Promise((resolve, reject) => {
        const ws = new WebSocket(`${WS_URL}/ws/process-progress/${task_id}`);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.progress !== undefined) {
              setLoadingMessage(`Transcribing... ${data.progress}%`);
            }
            if (data.status === 'complete' && data.result?.subtitles) {
              setSubtitles(data.result.subtitles);
              toast({ type: 'success', message: `${data.result.subtitles.length} subtitles generated` });
              ws.close();
              resolve();
            }
            if (data.status === 'error') {
              ws.close();
              reject(new Error(data.result?.detail || 'Processing failed'));
            }
          } catch {}
        };
        ws.onerror = () => { ws.close(); reject(new Error('WebSocket error')); };
        setTimeout(() => { ws.close(); reject(new Error('Processing timeout')); }, 300000);
      });
    } catch (error) {
      console.error(error);
      toast({ type: 'error', message: error.message || "Error generating subtitles" });
    } finally {
      setLoading(false);
      setLoadingMessage('Processing...');
    }
  };

  // --- Export: async with WebSocket progress ---
  const handleExport = async () => {
    if (!currentFilename || subtitles.length === 0) return;

    const taskId = crypto.randomUUID();
    setExportTaskId(taskId);
    setIsExporting(true);

    try {
      const res = await fetch(`${API_URL}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: currentFilename,
          subtitles,
          styles: subtitleStyles,
          task_id: taskId,
        })
      });

      if (!res.ok) throw new Error("Export failed");

      // Listen for completion via WebSocket
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(`${WS_URL}/ws/export-progress/${taskId}`);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.status === 'complete' && data.result?.filename) {
              ws.close();
              // Trigger download
              window.location.href = `${API_URL}/download/${data.result.filename}`;
              toast({ type: 'success', message: 'Export complete! Downloading...' });
              resolve();
            }
            if (data.status === 'error') {
              ws.close();
              reject(new Error(data.result?.detail || 'Export failed'));
            }
          } catch {}
        };
        ws.onerror = () => { ws.close(); reject(new Error('WebSocket error')); };
        setTimeout(() => { ws.close(); reject(new Error('Export timeout')); }, 600000);
      });

    } catch (error) {
      console.error(error);
      toast({ type: 'error', message: error.message || "Export failed" });
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportTaskId(null);
      }, 1500);
    }
  };

  const handleFileUpload = (e) => processFile(e.target.files[0]);

  const handleApplyPreset = (presetStyles) => {
    setSubtitleStyles(prev => ({ ...prev, ...presetStyles }));
    toast({ type: 'success', message: 'Style preset applied' });
  };

  return (
    <>
      <KeyboardShortcuts />
      <ExportModal
        isOpen={isExporting}
        taskId={exportTaskId}
        wsUrl={WS_URL}
        onCancel={() => { setIsExporting(false); setExportTaskId(null); }}
      />
      <div className="flex h-screen bg-gray-950 text-white overflow-hidden font-sans">
        {/* Left Panel - Video & Timeline */}
        <div
          className={`flex flex-col p-6 border-r border-gray-800 transition-colors duration-200 ${isDragging ? 'bg-indigo-900/20 border-2 border-dashed border-indigo-500/50' : ''}`}
          style={{ width: `${leftPanelWidth}%` }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <header className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="text-yellow-400" />
              <span>Reels Subtitle Generator</span>
            </h1>

            <div className="flex items-center gap-3">
              {/* Language selector */}
              <LanguageSelector value={language} onChange={setLanguage} />

              <label className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg cursor-pointer transition-all font-medium text-sm">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                <span>{loading ? loadingMessage : (isDragging ? "Drop Video Here" : "Upload Video")}</span>
                <input
                  type="file"
                  accept="video/mp4,video/mov,video/quicktime"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </label>

              {videoSrc && (
                <button
                  onClick={generateSubtitles}
                  disabled={loading || !currentFilename}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-all font-bold text-sm shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                  <span>{loading ? loadingMessage : 'Generate Subtitles'}</span>
                </button>
              )}

              {videoSrc && (
                <button
                  onClick={handleExport}
                  disabled={loading || subtitles.length === 0}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-all font-bold text-sm shadow-lg shadow-green-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} className="rotate-180" />}
                  <span>Export MP4</span>
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center bg-gray-950 rounded-2xl border border-gray-950 relative group overflow-hidden">
            <VideoPlayer
              ref={videoRef}
              src={videoSrc}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            >
              {videoSrc && (
                <div
                  className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center"
                  onMouseMove={(e) => {
                    if (e.buttons === 1 && activeTab === 'style') {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      setSubtitleStyles(prev => ({ ...prev, position: { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } }));
                    }
                  }}
                  style={{ pointerEvents: activeTab === 'style' ? 'auto' : 'none' }}
                >
                  {subtitles.map((sub, idx) => {
                    const isActive = currentTime >= sub.start && currentTime <= sub.end;
                    if (!isActive) return null;
                    return (
                      <div
                        key={idx}
                        className={`absolute text-center select-none ${activeTab === 'style' ? 'cursor-move ring-1 ring-blue-500/50 rounded p-1' : ''}`}
                        style={{
                          left: `${subtitleStyles.position.x}%`,
                          top: `${subtitleStyles.position.y}%`,
                          transform: 'translate(-50%, -50%)',
                          fontFamily: `'${subtitleStyles.fontFamily}', sans-serif`,
                          fontSize: `${subtitleStyles.fontSize}px`,
                          color: subtitleStyles.textColor,
                          textTransform: subtitleStyles.uppercase ? 'uppercase' : 'none',
                          fontWeight: 'bold',
                          width: '80%',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {sub.text}
                      </div>
                    );
                  })}
                </div>
              )}
            </VideoPlayer>
          </div>

          {/* Helper info */}
          <div className="mt-4 text-xs text-center text-gray-500">
            Video and subtitles are synced. Click a subtitle to jump to that moment. Press <span className="text-gray-400">?</span> for shortcuts.
          </div>

          {/* Video Controls */}
          {videoSrc && (
            <VideoControls
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              currentTime={currentTime}
              duration={duration}
              onFullscreen={handleFullscreen}
              playbackRate={playbackRate}
              onPlaybackRateChange={handlePlaybackRateChange}
              volume={volume}
              onVolumeChange={handleVolumeChange}
              isMuted={isMuted}
              onMuteToggle={handleMuteToggle}
            />
          )}

          {/* Timeline */}
          <Timeline
            subtitles={subtitles}
            currentTime={currentTime}
            duration={duration}
            onUpdateSubtitles={setSubtitles}
            onSeek={handleSeek}
          />
        </div>

        {/* Resize Handle */}
        <div
          className={`w-1 cursor-col-resize hover:bg-indigo-500 transition-colors ${isResizing ? 'bg-indigo-500' : 'bg-transparent'} flex-shrink-0`}
          onMouseDown={handleResizeStart}
        >
          <div className="w-full h-full" />
        </div>

        {/* Right Panel - Subtitles & Styles */}
        <div className="flex flex-col bg-gray-950 border-l border-gray-800" style={{ width: `${100 - leftPanelWidth}%` }}>
          {/* Tabs + Undo/Redo */}
          <div className="flex items-center bg-gray-900/80 p-1 border-b border-gray-800">
            <button
              onClick={() => setActiveTab('subtitles')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'subtitles' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <List size={14} /> SUBTITLES
            </button>
            <button
              onClick={() => setActiveTab('style')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'style' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Type size={14} /> STYLE
            </button>
            <div className="flex items-center gap-0.5 ml-1">
              <button
                onClick={() => { undo(); toast({ type: 'info', message: 'Undo' }); }}
                disabled={!canUndo}
                className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={14} />
              </button>
              <button
                onClick={() => { redo(); toast({ type: 'info', message: 'Redo' }); }}
                disabled={!canRedo}
                className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'subtitles' ? (
              <>
                <div className="p-4 border-b border-gray-800 bg-gray-900/30">
                  <h2 className="font-semibold text-gray-300 text-sm">Active Subtitles ({subtitles.length})</h2>
                </div>
                <div className="flex-1 overflow-hidden">
                  <SubtitleList
                    subtitles={subtitles}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                    onUpdateSubtitle={setSubtitles}
                  />
                </div>
              </>
            ) : (
              <StylePanel
                styles={subtitleStyles}
                onUpdateStyles={setSubtitleStyles}
                fontList={fonts}
                onApplyPreset={handleApplyPreset}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
