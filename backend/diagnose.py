import sys
import os
import shutil

print("--- Diagnostics Start ---")
print(f"Python: {sys.version}")

# 1. Check FFmpeg
ffmpeg_path = shutil.which("ffmpeg")
if ffmpeg_path:
    print(f"FFmpeg found at: {ffmpeg_path}")
else:
    print("ERROR: FFmpeg NOT found in PATH.")

# 2. Check Whisper Load
print("Loading Whisper...")
try:
    import whisper
    import torch
    device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Device: {device}")
    model = whisper.load_model("base", device=device)
    print("Whisper model loaded successfully.")
except Exception as e:
    print(f"ERROR loading Whisper: {e}")

print("--- Diagnostics End ---")
