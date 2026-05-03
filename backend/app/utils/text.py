from __future__ import annotations

import html
import re
import unicodedata


def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def normalize_text(text: str | None) -> str:
    """Normalize text for search: lowercase, no accents, alnum/spaces only."""
    if text is None:
        return ""
    value = str(text).strip()
    if not value:
        return ""
    value = strip_accents(value)
    value = value.lower().replace("\u00a0", " ")
    value = re.sub(r"[^a-z0-9\s|]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def make_combo_norm(album: str | None, title: str | None) -> str:
    album_n = normalize_text(album)
    title_n = normalize_text(title)
    if album_n and title_n:
        return f"{album_n} | {title_n}"
    return title_n or album_n


def _sanitize_lyrics_base(text: str | None) -> str | None:
    if text is None:
        return None

    value = str(text)
    if not value.strip():
        return None

    value = value.replace("\\/", "/")
    value = html.unescape(value)
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = value.replace("\u00a0", " ")

    value = re.sub(r"<(br)\s*/?>", "\n", value, flags=re.IGNORECASE)
    value = re.sub(r"</(p|div|li|h[1-6])\s*>", "\n", value, flags=re.IGNORECASE)
    value = re.sub(r"<(p|div|li|h[1-6])\b[^>]*>", "", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", "", value)

    lines: list[str] = []
    previous_blank = False
    for raw_line in value.split("\n"):
        line = re.sub(r"[\t ]+", " ", raw_line).strip()
        if not line:
            if lines and not previous_blank:
                lines.append("")
            previous_blank = True
            continue
        lines.append(line)
        previous_blank = False

    sanitized = "\n".join(lines).strip()
    return sanitized or None


def sanitize_song_lyrics(text: str | None) -> str | None:
    """Convert formatted lyrics with chords/HTML into plain text lyrics."""
    value = _sanitize_lyrics_base(text)
    if value is None:
        return None

    value = re.sub(r"\[[^\]]*\]", "", value)
    sanitized = re.sub(r"\n{3,}", "\n\n", value).strip()
    return sanitized or None


def sanitize_song_lyrics_with_chords(text: str | None) -> str | None:
    """Remove HTML/escape artifacts from chord lyrics while preserving chord symbols."""
    return _sanitize_lyrics_base(text)
