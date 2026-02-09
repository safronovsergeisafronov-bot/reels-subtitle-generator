import asyncio
import logging
import os
import re
import subprocess
import json
from typing import List, Dict, Optional, Callable

logger = logging.getLogger(__name__)

def format_timestamp(seconds: float) -> str:
    """Format seconds into ASS timestamp format H:MM:SS.cc"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centisecs = int(round((seconds % 1) * 100))
    if centisecs == 100:
        centisecs = 0
        secs += 1
    return f"{hours}:{minutes:02d}:{secs:02d}.{centisecs:02d}"

def generate_ass_content(subtitles: List[Dict], styles: Dict, video_width: int, video_height: int) -> str:
    """
    Generates Advanced Substation Alpha (ASS) content.
    Supports pixel-perfect positioning, custom fonts, and styling.
    """
    font_name = styles.get("fontFamily", "Arial")
    font_size = styles.get("fontSize", 24)
    text_color = styles.get("textColor", "#FFFFFF").lstrip('#')
    # ASS uses BGR hex format: &Hbbggrr&
    bgr_color = f"&H{text_color[4:6]}{text_color[2:4]}{text_color[0:2]}&"

    # Outline color (hex RGB -> BGR)
    outline_hex = styles.get("outlineColor", "#000000").lstrip('#')
    bgr_outline_color = f"&H{outline_hex[4:6]}{outline_hex[2:4]}{outline_hex[0:2]}&"

    outline_width = styles.get("outlineWidth", 2.0)
    shadow_depth = styles.get("shadowDepth", 2.0)
    bold_val = -1 if styles.get("bold", True) else 0

    # Calculate position (pixel offset from center)
    pos_x = int(video_width / 2 + styles["position"]["x"])
    pos_y = int(video_height / 2 - styles["position"]["y"])

    uppercase = styles.get("uppercase", False)

    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{bgr_color},&H000000FF,{bgr_outline_color},&H80000000,{bold_val},0,0,0,100,100,0,0,1,{outline_width},{shadow_depth},2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    events = []
    for sub in subtitles:
        start = format_timestamp(sub["start"])
        end = format_timestamp(sub["end"])
        text = sub["text"].upper() if uppercase else sub["text"]

        line = f"Dialogue: 0,{start},{end},Default,,0,0,0,,{{\\an5\\pos({pos_x},{pos_y})}}{text}"
        events.append(line)

    return ass_header + "\n".join(events)

def burn_subtitles(input_path: str, output_path: str, ass_path: str):
    """
    Uses FFmpeg to burn subtitles into the video (synchronous version).
    """
    abs_ass_path = os.path.abspath(ass_path)
    # FFmpeg filter parser: wrap path in single quotes to handle spaces and special chars
    # Inside single quotes, only \ and ' need escaping
    escaped_path = abs_ass_path.replace("\\", "\\\\").replace("'", "\\'")

    command = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"subtitles='{escaped_path}'",
        "-c:v", "libx264",
        "-c:a", "copy",
        "-preset", "fast",
        "-crf", "23",
        output_path
    ]

    logger.info("Running FFmpeg: %s", " ".join(command))
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout, stderr = process.communicate()

    if process.returncode != 0:
        logger.error("FFmpeg failed (rc=%d): %s", process.returncode, stderr)
        raise Exception(f"FFmpeg failed with return code {process.returncode}: {stderr[-500:] if stderr else 'no stderr'}")

    logger.info("FFmpeg completed successfully: %s", output_path)
    return output_path


async def burn_subtitles_async(
    input_path: str,
    output_path: str,
    ass_path: str,
    duration: float,
    progress_callback: Optional[Callable] = None,
):
    """
    Uses FFmpeg to burn subtitles into the video (async version with progress).
    Parses FFmpeg stderr to report encoding progress.
    """
    abs_ass_path = os.path.abspath(ass_path)
    # FFmpeg filter parser: wrap path in single quotes to handle spaces and special chars
    # Inside single quotes, only \ and ' need escaping
    escaped_path = abs_ass_path.replace("\\", "\\\\").replace("'", "\\'")

    command = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"subtitles='{escaped_path}'",
        "-c:v", "libx264",
        "-c:a", "copy",
        "-preset", "fast",
        "-crf", "23",
        "-progress", "pipe:1",
        output_path
    ]

    logger.info("Running async FFmpeg: %s", " ".join(command))
    process = await asyncio.create_subprocess_exec(
        *command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    time_pattern = re.compile(r"out_time_ms=(\d+)")

    while True:
        line = await process.stdout.readline()
        if not line:
            break
        decoded = line.decode("utf-8", errors="replace").strip()

        match = time_pattern.search(decoded)
        if match and duration > 0 and progress_callback:
            current_ms = int(match.group(1))
            current_seconds = current_ms / 1_000_000
            progress = min(int((current_seconds / duration) * 100), 99)
            await progress_callback(progress)

    await process.wait()

    if process.returncode != 0:
        stderr_output = await process.stderr.read()
        stderr_text = stderr_output.decode("utf-8", errors="replace")
        logger.error("FFmpeg failed (rc=%d): %s", process.returncode, stderr_text)
        raise Exception(f"FFmpeg failed with return code {process.returncode}: {stderr_text[-500:]}")

    if progress_callback:
        await progress_callback(100)

    logger.info("Async FFmpeg completed successfully: %s", output_path)
    return output_path


def get_video_info(file_path: str) -> Dict:
    """Retrieves video width, height, and duration using ffprobe."""
    command = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,duration",
        "-show_entries", "format=duration",
        "-of", "json",
        file_path
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        logger.warning("ffprobe failed for %s, using defaults", file_path)
        return {"width": 1080, "height": 1920, "duration": 0}

    data = json.loads(result.stdout)
    stream = data["streams"][0]

    duration = 0
    if "duration" in stream:
        duration = float(stream["duration"])
    elif "format" in data and "duration" in data["format"]:
        duration = float(data["format"]["duration"])

    return {
        "width": stream["width"],
        "height": stream["height"],
        "duration": duration,
    }
