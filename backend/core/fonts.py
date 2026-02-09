import os
import glob
import platform
from typing import List, Dict

if platform.system() == "Darwin":
    SYSTEM_FONT_PATHS = [
        "/System/Library/Fonts",
        "/Library/Fonts",
        os.path.expanduser("~/Library/Fonts"),
    ]
elif platform.system() == "Linux":
    SYSTEM_FONT_PATHS = [
        "/usr/share/fonts",
        "/usr/local/share/fonts",
    ]
else:
    SYSTEM_FONT_PATHS = [
        "/usr/share/fonts",
    ]

# Project-bundled fonts
_PROJECT_FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fonts")

def get_available_fonts() -> List[Dict[str, str]]:
    """
    Scans system font directories and returns a list of available fonts.
    Returns: List of dicts with 'name' (filename without extension) and 'filename'.
    """
    fonts = []
    seen_names = set()

    # Combine system paths with project fonts directory
    scan_dirs = list(SYSTEM_FONT_PATHS)
    if os.path.exists(_PROJECT_FONTS_DIR):
        scan_dirs.append(_PROJECT_FONTS_DIR)
        # Also add subdirectories of the project fonts dir
        for entry in os.listdir(_PROJECT_FONTS_DIR):
            subdir = os.path.join(_PROJECT_FONTS_DIR, entry)
            if os.path.isdir(subdir):
                scan_dirs.append(subdir)

    for folder in scan_dirs:
        if not os.path.exists(folder):
            continue

        # Look for common font extensions
        # We focus on TTF and OTF for web compatibility (browsers handle them well)
        patterns = ["*.ttf", "*.otf", "*.ttc"]
        files = []
        for pattern in patterns:
            files.extend(glob.glob(os.path.join(folder, pattern)))

        for file_path in files:
            filename = os.path.basename(file_path)
            # Use filename as robust identifier for now.
            # In a real app we might parse the TTF name table, but that requires extra libs (fonttools).
            name, ext = os.path.splitext(filename)

            # Simple clean up for display
            display_name = name

            # Filter out very large fonts (like Apple Color Emoji) that cause browser issues
            if os.path.getsize(file_path) > 20 * 1024 * 1024:
                continue

            if display_name not in seen_names:
                fonts.append({
                    "name": display_name,
                    "filename": filename,
                    "path": file_path, # Internal use
                    "type": ext.lower().replace(".", "")
                })
                seen_names.add(display_name)

    # Sort alphabetically
    fonts.sort(key=lambda x: x["name"])
    return fonts

def get_font_path(filename: str) -> str:
    """Returns absolute path for a given font filename if found in system or project paths."""
    for folder in SYSTEM_FONT_PATHS:
        potential_path = os.path.join(folder, filename)
        if os.path.exists(potential_path):
            return potential_path

    # Check project fonts directory and its subdirectories
    if os.path.exists(_PROJECT_FONTS_DIR):
        potential_path = os.path.join(_PROJECT_FONTS_DIR, filename)
        if os.path.exists(potential_path):
            return potential_path
        for entry in os.listdir(_PROJECT_FONTS_DIR):
            subdir = os.path.join(_PROJECT_FONTS_DIR, entry)
            if os.path.isdir(subdir):
                potential_path = os.path.join(subdir, filename)
                if os.path.exists(potential_path):
                    return potential_path

    return None
