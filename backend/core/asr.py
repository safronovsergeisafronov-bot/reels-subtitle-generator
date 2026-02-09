import logging
import os
import subprocess
from typing import Optional

from openai import OpenAI

logger = logging.getLogger(__name__)

_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. "
                "Create backend/.env with your key: OPENAI_API_KEY=sk-..."
            )
        _client = OpenAI(api_key=api_key)
    return _client

OPENAI_FILE_LIMIT = 25 * 1024 * 1024  # 25 MB


def _extract_audio(video_path: str) -> str:
    """Extract audio from video as mp3 to reduce file size for API upload."""
    audio_path = video_path.rsplit(".", 1)[0] + "_audio.mp3"
    command = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "libmp3lame",
        "-ab", "64k",
        "-ar", "16000",
        "-ac", "1",
        audio_path,
    ]
    logger.info("Extracting audio: %s", " ".join(command))
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error("Audio extraction failed: %s", result.stderr)
        raise RuntimeError(f"FFmpeg audio extraction failed: {result.stderr[:500]}")
    return audio_path


def transcribe_audio(file_path: str, language: Optional[str] = None):
    """
    Transcribes audio/video file using OpenAI Whisper API.
    Returns list of words with timestamps.
    """
    logger.info("Starting transcription for %s (language=%s)", file_path, language or "auto-detect")

    # Extract audio if the file is too large for the API
    upload_path = file_path
    cleanup_path = None
    if os.path.getsize(file_path) > OPENAI_FILE_LIMIT:
        logger.info("File exceeds 25MB, extracting audio track...")
        upload_path = _extract_audio(file_path)
        cleanup_path = upload_path

    try:
        kwargs = {
            "model": "whisper-1",
            "response_format": "verbose_json",
            "timestamp_granularities": ["word"],
        }
        if language:
            kwargs["language"] = language

        with open(upload_path, "rb") as audio_file:
            result = _get_client().audio.transcriptions.create(file=audio_file, **kwargs)
    finally:
        if cleanup_path and os.path.exists(cleanup_path):
            os.remove(cleanup_path)

    words = []
    for w in result.words:
        words.append({
            "word": w.word.strip(),
            "start": round(w.start, 3),
            "end": round(w.end, 3),
        })

    logger.info("Transcription complete: %d words extracted", len(words))
    return words
