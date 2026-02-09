import logging
import os
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

_client = None

def _get_client():
    global _client
    if _client is None:
        try:
            import anthropic
        except ImportError:
            raise RuntimeError(
                "anthropic package is not installed. "
                "Run: pip install anthropic"
            )
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. "
                "Add it to backend/.env: ANTHROPIC_API_KEY=sk-ant-..."
            )
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def correct_subtitles(subtitles: List[Dict], language: Optional[str] = None) -> List[Dict]:
    """
    Uses Claude to fix punctuation, capitalization, and spelling in subtitle texts.
    Returns corrected subtitles with same structure (start, end, text).
    Falls back to originals on any error.
    """
    if not subtitles:
        return subtitles

    try:
        # Build numbered text list
        lines = []
        for i, sub in enumerate(subtitles):
            lines.append(f"{i+1}. {sub['text']}")

        numbered_text = "\n".join(lines)

        lang_hint = f" The language is {language}." if language else ""

        prompt = f"""Fix the punctuation, capitalization, and spelling in these subtitle segments.{lang_hint}

Rules:
- Return EXACTLY {len(subtitles)} lines, numbered the same way
- Only fix grammar, punctuation, capitalization, and obvious spelling errors
- Do NOT change the meaning or rephrase
- Do NOT merge or split segments
- Keep each segment's content on its own numbered line
- Format: "1. corrected text" (one per line)

Subtitles:
{numbered_text}"""

        response = _get_client().messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )

        result_text = response.content[0].text.strip()

        # Parse numbered lines
        corrected_texts = []
        for line in result_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            # Remove numbering: "1. text" -> "text"
            parts = line.split(". ", 1)
            if len(parts) == 2 and parts[0].isdigit():
                corrected_texts.append(parts[1])
            else:
                corrected_texts.append(line)

        # Validate count matches
        if len(corrected_texts) != len(subtitles):
            logger.warning(
                "Claude returned %d segments but expected %d, falling back to originals",
                len(corrected_texts), len(subtitles)
            )
            return subtitles

        # Build corrected subtitles
        corrected = []
        for i, sub in enumerate(subtitles):
            corrected.append({
                "start": sub["start"],
                "end": sub["end"],
                "text": corrected_texts[i],
            })

        logger.info("Text correction complete: %d segments corrected", len(corrected))
        return corrected

    except Exception as e:
        logger.warning("Text correction failed, using originals: %s", str(e))
        return subtitles
