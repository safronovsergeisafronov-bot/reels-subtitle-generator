import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoPlayer from './components/VideoPlayer';
import Timeline from './components/Timeline';
import VideoControls from './components/VideoControls';
import ExportModal from './components/ExportModal';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import ErrorBoundary from './components/ErrorBoundary';
import AppHeader from './components/AppHeader';
import SubtitleOverlay from './components/SubtitleOverlay';
import VideoInfoBar from './components/VideoInfoBar';
import RightPanel from './components/RightPanel';
import Sidebar from './components/Sidebar';
import { ToastProvider, useToast } from './components/Toast';
import { ModalProvider, useModal } from './components/ConfirmModal';
import { useHistory } from './hooks/useHistory';
import { useAutoSave, loadAutoSave } from './hooks/useAutoSave';
import { stylePresets } from './data/stylePresets';
import { API_URL, WS_URL, BASE_URL } from './api/client';

function AppContent() {
  const { toast } = useToast();
  const { prompt: modalPrompt } = useModal();
  const [searchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [savingProject, setSavingProject] = useState(false);

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
  const leftPanelRef = useRef(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 1080, height: 1920 });
  const [videoContainerWidth, setVideoContainerWidth] = useState(null);
  const [timelineHeight, setTimelineHeight] = useState(144);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    const defaults = {
      fontFamily: "Inter",
      fontSize: 80,
      textColor: "#FFFFFF",
      uppercase: false,
      position: { x: 0, y: -800 },
      outlineWidth: 2,
      outlineColor: "#000000",
      shadowDepth: 0,
      bold: true
    };
    if (saved) {
      if (saved.fontSize && saved.fontSize < 20) {
        saved.fontSize = Math.round(saved.fontSize * 3);
      }
      if (saved.position && saved.position.x >= 0 && saved.position.x <= 100 && saved.position.y >= 0 && saved.position.y <= 100) {
        saved.position = {
          x: Math.round((saved.position.x / 100 - 0.5) * 1080),
          y: Math.round(-((saved.position.y / 100 - 0.5) * 1920))
        };
      }
      return saved;
    }
    return defaults;
  });

  // Auto-save subtitles and styles
  useAutoSave('subtitle-data', subtitles.length > 0 ? { subtitles, filename: currentFilename } : null);
  useAutoSave('subtitle-styles', subtitleStyles);

  // Load user settings from backend (default preset, language)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/settings`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.default_language && !searchParams.get('project')) {
          setLanguage(data.default_language);
        }
        if (data.default_preset && !searchParams.get('project')) {
          const preset = stylePresets.find(p => p.name === data.default_preset);
          if (preset) {
            const { name, description, ...presetStyles } = preset;
            setSubtitleStyles(prev => ({ ...prev, ...presetStyles }));
          }
        }
      } catch {}
    };
    loadSettings();
  }, []);

  // Load project from URL param (?project=id)
  useEffect(() => {
    const pid = searchParams.get('project');
    if (!pid) return;
    const loadProject = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/projects/${pid}`);
        if (!res.ok) return;
        const project = await res.json();
        setProjectId(project.id);
        setProjectName(project.name);
        if (project.subtitles?.length) setSubtitles(project.subtitles);
        if (project.styles && Object.keys(project.styles).length) {
          setSubtitleStyles(prev => ({ ...prev, ...project.styles }));
        }
        if (project.language) setLanguage(project.language);
        if (project.video_filename) setCurrentFilename(project.video_filename);
        toast({ type: 'success', message: `Проект "${project.name}" загружен` });
      } catch (err) {
        console.error('Failed to load project:', err);
      }
    };
    loadProject();
  }, []);

  // Save project to backend
  const handleSaveProject = useCallback(async () => {
    if (subtitles.length === 0) {
      toast({ type: 'error', message: 'Нет субтитров для сохранения' });
      return;
    }
    const name = projectName || await modalPrompt('Название проекта:', {
      title: 'Сохранить проект',
      defaultValue: currentFilename || 'Новый проект',
      confirmText: 'Сохранить',
    });
    if (!name) return;
    setSavingProject(true);
    try {
      const res = await fetch(`${BASE_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId || undefined,
          name,
          video_filename: currentFilename,
          subtitles,
          styles: subtitleStyles,
          language: language === 'auto' ? null : language,
          duration,
          width: videoDimensions.width,
          height: videoDimensions.height,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjectId(data.id);
        setProjectName(name);
        toast({ type: 'success', message: 'Проект сохранён' });
      }
    } catch (err) {
      console.error('Failed to save project:', err);
      toast({ type: 'error', message: 'Ошибка сохранения проекта' });
    } finally {
      setSavingProject(false);
    }
  }, [subtitles, projectName, projectId, currentFilename, subtitleStyles, language, duration, videoDimensions, toast, modalPrompt]);

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

  // ResizeObserver to track video container width for scaling
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setVideoContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, [videoSrc]);

  // Keyboard shortcuts: undo/redo, space to play/pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      if (e.key === ' ' && videoRef.current) {
        e.preventDefault();
        if (isPlaying) videoRef.current.pause();
        else videoRef.current.play();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
          toast({ type: 'info', message: 'Undo' });
        }
      }

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

  const handleTimeUpdate = useCallback((e) => setCurrentTime(e.target.currentTime), []);
  const handleLoadedMetadata = useCallback((e) => {
    setDuration(e.target.duration);
    setVideoDimensions({ width: e.target.videoWidth, height: e.target.videoHeight });
  }, []);

  const handleSeek = useCallback((time) => {
    if (videoRef.current) videoRef.current.currentTime = time;
  }, []);

  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  }, [isPlaying]);

  const handleFullscreen = useCallback(() => {
    const container = document.getElementById('video-container');
    if (container) {
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
    }
  }, []);

  const handlePlaybackRateChange = useCallback((rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }, []);

  const handleVolumeChange = useCallback((val) => {
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  }, []);

  const handleMuteToggle = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) videoRef.current.muted = newMuted;
  }, [isMuted]);

  // Panel resize
  const handleResizeStart = useCallback(() => setIsResizing(true), []);

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

  // Timeline vertical resize
  useEffect(() => {
    if (!isResizingTimeline) return;
    const handleMouseMove = (e) => {
      const panel = leftPanelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const newHeight = rect.bottom - e.clientY;
      setTimelineHeight(Math.max(80, Math.min(500, newHeight)));
    };
    const handleMouseUp = () => setIsResizingTimeline(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTimeline]);

  // Drag-and-drop
  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  }, []);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    setVideoSrc(URL.createObjectURL(file));
    setSubtitles([]);
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
  }, [setSubtitles, toast]);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "video/mp4" || file.type === "video/quicktime")) {
      processFile(file);
    }
  }, [processFile]);

  const generateSubtitles = useCallback(async () => {
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
      if (!processRes.ok) {
        const errData = await processRes.json().catch(() => ({}));
        throw new Error(errData.detail || `Processing failed (${processRes.status})`);
      }
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
  }, [currentFilename, language, setSubtitles, toast]);

  const handleExport = useCallback(async () => {
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

      await new Promise((resolve, reject) => {
        const ws = new WebSocket(`${WS_URL}/ws/export-progress/${taskId}`);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.status === 'complete' && data.result?.filename) {
              ws.close();
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
  }, [currentFilename, subtitles, subtitleStyles, toast]);

  const handleFileUpload = useCallback((e) => processFile(e.target.files[0]), [processFile]);

  const handleApplyPreset = useCallback((presetStyles) => {
    setSubtitleStyles(prev => ({ ...prev, ...presetStyles }));
    toast({ type: 'success', message: 'Style preset applied' });
  }, [toast]);

  const handleCancelExport = useCallback(() => {
    setIsExporting(false);
    setExportTaskId(null);
  }, []);

  const handleToggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);

  const handleOpenProject = useCallback(async (pid) => {
    try {
      const res = await fetch(`${BASE_URL}/api/projects/${pid}`);
      if (!res.ok) return;
      const project = await res.json();
      setProjectId(project.id);
      setProjectName(project.name);
      if (project.subtitles?.length) setSubtitles(project.subtitles);
      if (project.styles && Object.keys(project.styles).length) {
        setSubtitleStyles(prev => ({ ...prev, ...project.styles }));
      }
      if (project.language) setLanguage(project.language);
      if (project.video_filename) setCurrentFilename(project.video_filename);
      setSidebarOpen(false);
      toast({ type: 'success', message: `Проект "${project.name}" загружен` });
    } catch {
      toast({ type: 'error', message: 'Ошибка загрузки проекта' });
    }
  }, [setSubtitles, toast]);

  const scaleFactor = useMemo(() =>
    videoContainerWidth && videoDimensions.width
      ? videoContainerWidth / videoDimensions.width
      : 1,
    [videoContainerWidth, videoDimensions.width]
  );

  return (
    <>
      <KeyboardShortcuts />
      <ExportModal
        isOpen={isExporting}
        taskId={exportTaskId}
        wsUrl={WS_URL}
        onCancel={handleCancelExport}
      />
      <div className={`flex h-screen bg-gray-950 text-white overflow-hidden font-sans ${isResizing || isResizingTimeline ? 'select-none' : ''}`}>
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={handleToggleSidebar}
          onOpenProject={handleOpenProject}
        />

        {/* Left Panel - Video & Timeline */}
        <div
          ref={leftPanelRef}
          className={`flex flex-col p-4 border-r border-gray-800 transition-colors duration-200 ${isDragging ? 'bg-indigo-900/20 border-2 border-dashed border-indigo-500/50' : ''}`}
          style={{ width: `${leftPanelWidth}%` }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AppHeader
            language={language}
            onLanguageChange={setLanguage}
            loading={loading}
            loadingMessage={loadingMessage}
            isDragging={isDragging}
            videoSrc={videoSrc}
            currentFilename={currentFilename}
            subtitles={subtitles}
            savingProject={savingProject}
            projectId={projectId}
            onFileUpload={handleFileUpload}
            onGenerateSubtitles={generateSubtitles}
            onExport={handleExport}
            onSaveProject={handleSaveProject}
            onToggleSidebar={handleToggleSidebar}
          />

          <ErrorBoundary fallbackTitle="Video player error">
            <div className="flex-1 flex items-center justify-center bg-gray-950 rounded-2xl border border-gray-950 relative group overflow-hidden min-h-0">
              <VideoPlayer
                ref={videoRef}
                src={videoSrc}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                videoDimensions={videoDimensions}
              >
                {videoSrc && (
                  <SubtitleOverlay
                    subtitles={subtitles}
                    currentTime={currentTime}
                    subtitleStyles={subtitleStyles}
                    scaleFactor={scaleFactor}
                    activeTab={activeTab}
                    videoDimensions={videoDimensions}
                    onUpdateStyles={setSubtitleStyles}
                  />
                )}
              </VideoPlayer>
            </div>
          </ErrorBoundary>

          <VideoInfoBar
            videoSrc={videoSrc}
            videoDimensions={videoDimensions}
            duration={duration}
            subtitleStyles={subtitleStyles}
          />

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

          {/* Timeline resize handle */}
          <div
            className={`h-3 flex items-center justify-center cursor-row-resize group shrink-0 border-y transition-colors ${isResizingTimeline ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-gray-900/50 border-gray-800 hover:bg-gray-800/80 hover:border-gray-700'}`}
            onMouseDown={() => setIsResizingTimeline(true)}
          >
            <div className={`w-12 h-1 rounded-full transition-colors ${isResizingTimeline ? 'bg-indigo-400' : 'bg-gray-600 group-hover:bg-gray-400'}`} />
          </div>

          {/* Timeline */}
          <div style={{ height: timelineHeight, flexShrink: 0 }}>
            <Timeline
              subtitles={subtitles}
              currentTime={currentTime}
              duration={duration}
              onUpdateSubtitles={setSubtitles}
              onSeek={handleSeek}
            />
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className={`w-1 cursor-col-resize hover:bg-indigo-500 transition-colors ${isResizing ? 'bg-indigo-500' : 'bg-transparent'} flex-shrink-0`}
          onMouseDown={handleResizeStart}
        >
          <div className="w-full h-full" />
        </div>

        {/* Right Panel - Subtitles & Styles */}
        <ErrorBoundary fallbackTitle="Panel error">
          <RightPanel
            activeTab={activeTab}
            onTabChange={setActiveTab}
            subtitles={subtitles}
            currentTime={currentTime}
            onSeek={handleSeek}
            onUpdateSubtitles={setSubtitles}
            subtitleStyles={subtitleStyles}
            onUpdateStyles={setSubtitleStyles}
            fonts={fonts}
            onApplyPreset={handleApplyPreset}
            videoDimensions={videoDimensions}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            leftPanelWidth={leftPanelWidth}
          />
        </ErrorBoundary>
      </div>
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <ModalProvider>
        <AppContent />
      </ModalProvider>
    </ToastProvider>
  );
}

export default App;
