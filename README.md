# 🎬 Reels Subtitle Generator

AI-powered subtitle generator for Instagram Reels and TikTok videos. Features automatic speech recognition, visual subtitle editor, timeline manipulation, and video export with burned-in subtitles.

![Demo](./demo.png)

## ✨ Features

- **🎙️ AI Speech Recognition** — Uses OpenAI Whisper for accurate transcription
- **🎨 Visual Subtitle Editor** — Drag subtitles directly on video preview
- **⏱️ Interactive Timeline** — Stretch, move, and snap subtitles with precision
- **🔤 System Fonts** — Access all your macOS fonts
- **📤 Video Export** — Burn subtitles directly into video file
- **📋 Copy/Paste** — Cmd+C/V for subtitle duplication
- **🧲 Magnetic Snapping** — Subtitles auto-align with adjacent clips

## 🚀 Quick Start

### Prerequisites

- macOS
- Python 3.8+
- Node.js 16+
- FFmpeg (`brew install ffmpeg`)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/reels-subtitle-generator.git
cd reels-subtitle-generator
```

2. Run the application:
```bash
chmod +x start_app.command
./start_app.command
```

The app will automatically:
- Install Python dependencies
- Install Node.js dependencies
- Start backend server (port 8000)
- Start frontend server (port 5173)
- Open browser

## 📁 Project Structure

```
├── backend/               # Python FastAPI server
│   ├── main.py           # API endpoints
│   └── core/
│       ├── asr.py        # Whisper transcription
│       ├── segmentation.py # Subtitle segmentation
│       ├── fonts.py      # System font scanner
│       └── export.py     # Video export with FFmpeg
├── frontend/             # React + Vite app
│   └── src/
│       ├── App.jsx       # Main application
│       └── components/   # UI components
└── start_app.command     # One-click launcher
```

## 🎛️ Usage

1. **Upload Video** — Drag & drop or click "Upload Video"
2. **Edit Subtitles** — Click on any subtitle in the list to edit text
3. **Style Text** — Switch to "STYLE" tab to change font, size, color
4. **Position** — Drag subtitle text on video preview to reposition
5. **Timeline** — Drag subtitle blocks to adjust timing, drag edges to resize
6. **Export** — Click "Export MP4" to create final video with burned-in subtitles

## ⚙️ Tech Stack

- **Frontend:** React, Vite, Lucide Icons
- **Backend:** FastAPI, Uvicorn
- **AI:** OpenAI Whisper
- **Video:** FFmpeg

## 📝 License

MIT License

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.
