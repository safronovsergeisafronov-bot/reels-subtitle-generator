import React, { useState, useRef, useEffect } from 'react';
import VideoPlayer from './components/VideoPlayer';
import SubtitleList from './components/SubtitleList';
import StylePanel from './components/StylePanel';
import Timeline from './components/Timeline';
import VideoControls from './components/VideoControls';
import ExportModal from './components/ExportModal';
import { Upload, Loader2, Sparkles, Type, List } from 'lucide-react';

// IMPORTANT: Ensure backend is running!
// const API_URL = "http://localhost:8000/api";
// For local dev, we assume standard localhost:8000
const API_URL = "http://127.0.0.1:8000/api";

function App() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [currentFilename, setCurrentFilename] = useState(null);
  const [duration, setDuration] = useState(0);
  const [subtitles, setSubtitles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState('subtitles'); // 'subtitles' or 'style'
  const [isPlaying, setIsPlaying] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(66.66); // 2/3 in percentage
  const [isResizing, setIsResizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const videoRef = useRef(null);

  // Phase 2: Styling State
  const [fonts, setFonts] = useState([]);
  const [subtitleStyles, setSubtitleStyles] = useState({
    fontFamily: "Inter",
    fontSize: 28,
    textColor: "#FFFFFF",
    uppercase: false,
    position: { x: 50, y: 80 } // Percentage
  });

  // Fetch fonts and inject into document
  useEffect(() => {
    const fetchFonts = async () => {
      try {
        const res = await fetch(`${API_URL}/fonts`);
        const data = await res.json();
        setFonts(data.fonts);

        // Inject @font-face rules
        const style = document.createElement('style');
        style.id = 'dynamic-fonts';
        let css = '';
        data.fonts.forEach(font => {
          css += `
            @font-face {
              font-family: '${font.name}';
              src: url('${API_URL}/font-file/${font.filename}');
            }
          `;
        });
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
      } catch (err) {
        console.error("Failed to fetch fonts:", err);
      }
    };
    fetchFonts();
  }, []);


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

  const handleTimeUpdate = (e) => {
    setCurrentTime(e.target.currentTime);
  };

  const handleLoadedMetadata = (e) => {
    setDuration(e.target.duration);
  };

  const handleSeek = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleFullscreen = () => {
    const container = document.getElementById('video-container');
    if (container) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
    }
  };

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      setLeftPanelWidth(Math.max(30, Math.min(80, newWidth))); // Limit between 30% and 80%
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === "video/mp4" || file.type === "video/quicktime")) {
      // mock the event structure needed by handleFileUpload or call logic directly
      // Reuse handleFileUpload logic by extracting it or just copy-pasting the relevant parts.
      // Let's refactor handleFileUpload to accept a file directly might be cleaner, 
      // but for minimal changes let's just do the Logic here or create a synthetic event.

      // Better: extracting the logic
      processFile(file);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    setVideoSrc(URL.createObjectURL(file));
    setLoading(true);

    try {
      // 1. Upload Video
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const { filename } = await uploadRes.json();
      setCurrentFilename(filename);

      // 2. Process Video (ASR + Segmentation)
      const processRes = await fetch(`${API_URL}/process?filename=${filename}`, {
        method: "POST",
      });

      if (!processRes.ok) throw new Error("Processing failed");
      const data = await processRes.json();

      setSubtitles(data.subtitles);

    } catch (error) {
      console.error(error);
      alert("Error processing video. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }

  const handleExport = async () => {
    if (!currentFilename) return;
    setIsExporting(true);
    setExportProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const res = await fetch(`${API_URL}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: currentFilename,
          subtitles: subtitles,
          styles: subtitleStyles
        })
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      if (!res.ok) throw new Error("Export failed");
      const { filename } = await res.json();

      // Trigger download
      window.location.href = `${API_URL}/download/${filename}`;
    } catch (error) {
      console.error(error);
      clearInterval(progressInterval);
      alert("Export failed. Check backend logs.");
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  return (
    <>
      <ExportModal
        isOpen={isExporting}
        progress={exportProgress}
        onCancel={() => setIsExporting(false)}
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

            <label
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg cursor-pointer transition-all font-medium text-sm"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              <span>{loading ? "Processing..." : (isDragging ? "Drop Video Here" : "Upload Video")}</span>
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
                onClick={handleExport}
                disabled={loading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-all font-bold text-sm shadow-lg shadow-green-500/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} className="rotate-180" />}
                <span>Export MP4</span>
              </button>
            )}
          </header>

          <div className="flex-1 flex items-center justify-center bg-gray-950 rounded-2xl border border-gray-950 relative group overflow-hidden">
            <VideoPlayer
              ref={videoRef}
              src={videoSrc}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            >
              {/* Visual Overlay for Subtitles - Now perfectly aligned to video frame */}
              {videoSrc && (
                <div
                  className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center"
                  onMouseMove={(e) => {
                    if (e.buttons === 1 && activeTab === 'style') { // Only drag if style tab is active and mouse is down
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      setSubtitleStyles(prev => ({ ...prev, position: { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } }));
                    }
                  }}
                  style={{ pointerEvents: activeTab === 'style' ? 'auto' : 'none' }}
                >
                  {/* Find current segment */}
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
                          width: '80%', // Limit width to prevent overflow
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

          {/* Helper info (optional) */}
          <div className="mt-4 text-xs text-center text-gray-500">
            Video and subtitles are synced. Click a subtitle to jump to that moment.
          </div>

          {/* Video Controls */}
          {videoSrc && (
            <VideoControls
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              currentTime={currentTime}
              duration={duration}
              onFullscreen={handleFullscreen}
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
          {/* Tabs */}
          <div className="flex bg-gray-900/80 p-1 border-b border-gray-800">
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
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
