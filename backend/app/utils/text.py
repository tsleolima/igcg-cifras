from __future__ import annotations

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
