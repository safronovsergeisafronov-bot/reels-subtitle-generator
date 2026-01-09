import os
import subprocess
import json
from typing import List, Dict

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
    
    # Calculate position (percentage to pixels)
    pos_x = int((styles["position"]["x"] / 100) * video_width)
    pos_y = int((styles["position"]["y"] / 100) * video_height)
    
    uppercase = styles.get("uppercase", False)

    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{bgr_color},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    events = []
    for sub in subtitles:
        start = format_timestamp(sub["start"])
        end = format_timestamp(sub["end"])
        text = sub["text"].upper() if uppercase else sub["text"]
        
        # In ASS, alignment 2 is bottom center. 
        # Since we use absolute positioning \pos(x,y), alignment affects where the anchor is.
        # \an5 is middle-center. Let's use \an5 for predictable positioning.
        line = f"Dialogue: 0,{start},{end},Default,,0,0,0,,{{\\an5\\pos({pos_x},{pos_y})}}{text}"
        events.append(line)
        
    return ass_header + "\n".join(events)

def burn_subtitles(input_path: str, output_path: str, ass_path: str):
    """
    Uses FFmpeg to burn subtitles into the video.
    """
    # Ensure the path is absolute for ffmpeg filter
    abs_ass_path = os.path.abspath(ass_path)
    
    # Escape special chars for FFmpeg filter
    # Replace : with \: and \ with \\\\ for FFmpeg path
    escaped_path = abs_ass_path.replace("\\", "/").replace(":", "\\:")
    
    command = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"subtitles={escaped_path}",
        "-c:v", "libx264",  # Re-encode video to properly burn in subtitles
        "-c:a", "copy",     # Copy audio without re-encoding
        "-preset", "fast",  # Balance speed and quality
        "-crf", "23",       # Good quality
        output_path
    ]
    
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout, stderr = process.communicate()
    
    if process.returncode != 0:
        print(f"FFmpeg Error: {stderr}")
        raise Exception(f"FFmpeg failed with return code {process.returncode}")
        
    return output_path

def get_video_info(file_path: str) -> Dict[str, int]:
    """Retrieves video width and height using ffprobe."""
    command = [
        "ffprobe", "-v", "error", 
        "-select_streams", "v:0", 
        "-show_entries", "stream=width,height", 
        "-of", "json", 
        file_path
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        # Fallback to standard 1080x1920 if ffprobe fails
        return {"width": 1080, "height": 1920}
    
    data = json.loads(result.stdout)
    stream = data["streams"][0]
    return {"width": stream["width"], "height": stream["height"]}

