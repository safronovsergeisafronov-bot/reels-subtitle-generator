import whisper
import torch

# Load model globally to avoid reloading on every request
# Use 'turbo' for best balance of speed and accuracy.
# MPS (Mac Metal) currently has issues with word_timestamps (float64 error),
# so we default to CPU to be safe for now.
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading Whisper model on {device}...")
model = whisper.load_model("turbo", device=device)

def transcribe_audio(file_path: str):
    """
    Transcribes audio/video file using Whisper and returns list of words with timestamps.
    """
    # word_timestamps=True is required for our segmentation logic
    # This feature sometimes fails on MPS due to float64 requirement in DTW.
    # We are running on CPU to avoid this.
    result = model.transcribe(file_path, word_timestamps=True)
    
    words = []
    for segment in result["segments"]:
        for word in segment["words"]:
            words.append({
                "word": word["word"].strip(),
                "start": word["start"],
                "end": word["end"]
            })
            
    return words
