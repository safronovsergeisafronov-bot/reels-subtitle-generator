import os
import glob
import platform
import struct
from typing import List, Dict, Optional, Tuple

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

def extract_font_family(font_path: str) -> Optional[str]:
    """Read TTF/OTF name table to get the internal font family name (nameID=1)."""
    try:
        with open(font_path, "rb") as f:
            header = f.read(4)
            if header == b"ttcf":
                return None
            f.seek(0)

            # Offset table: 12 bytes (sfVersion[4], numTables[2], ...)
            offset_table = f.read(12)
            if len(offset_table) < 12:
                return None
            num_tables = struct.unpack(">H", offset_table[4:6])[0]

            # Find 'name' table
            name_offset = None
            for _ in range(num_tables):
                record = f.read(16)
                if len(record) < 16:
                    return None
                tag = record[0:4]
                if tag == b"name":
                    name_offset = struct.unpack(">I", record[8:12])[0]
                    break

            if name_offset is None:
                return None

            f.seek(name_offset)
            # Name table header: format[2], count[2], stringOffset[2]
            name_header = f.read(6)
            if len(name_header) < 6:
                return None
            _, count, string_offset = struct.unpack(">HHH", name_header)
            strings_start = name_offset + string_offset

            best = None
            fallback_win = None
            fallback_mac = None

            for _ in range(count):
                rec = f.read(12)
                if len(rec) < 12:
                    break
                platform_id, encoding_id, language_id, name_id, length, offset = struct.unpack(">HHHHHH", rec)
                if name_id != 1:
                    continue

                pos = f.tell()
                f.seek(strings_start + offset)
                raw = f.read(length)
                f.seek(pos)

                if platform_id == 3 and encoding_id == 1:
                    try:
                        decoded = raw.decode("utf-16-be")
                    except Exception:
                        continue
                    if language_id == 0x0409:
                        best = decoded
                        break
                    if fallback_win is None:
                        fallback_win = decoded
                elif platform_id == 1 and encoding_id == 0:
                    if fallback_mac is None:
                        try:
                            fallback_mac = raw.decode("mac-roman")
                        except Exception:
                            pass

            return best or fallback_win or fallback_mac
    except Exception:
        return None


def get_font_info_by_name(display_name: str) -> Tuple[str, Optional[str]]:
    """Resolve a display font name to (internal_family_name, font_file_path).

    Tries common font extensions to find the file, then reads the internal
    family name from the font's name table.
    Falls back to (display_name, None) if the font file cannot be found.
    """
    for ext in (".otf", ".ttf", ".ttc"):
        path = get_font_path(display_name + ext)
        if path:
            family = extract_font_family(path)
            if family:
                return (family, path)
            return (display_name, path)
    return (display_name, None)


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
