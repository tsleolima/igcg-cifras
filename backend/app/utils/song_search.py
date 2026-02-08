from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.album import Album
from app.models.artist import Artist
from app.models.song import Song
from app.utils.text import make_combo_norm, normalize_text


_cache_lock = asyncio.Lock()
_cache_signature: tuple[int, datetime | None] | None = None
_cache_items: list[dict[str, Any]] | None = None


async def get_song_search_index(db: AsyncSession) -> list[dict[str, Any]]:
    """Build (and cache) an in-memory search index of songs.

    This avoids hitting the DB for every fuzzy operation and keeps fuzzy search fast.
    Cache invalidation is based on (count(*), max(updated_at)).
    """

    global _cache_signature, _cache_items

    sig_result = await db.execute(select(func.count(Song.id), func.max(Song.updated_at)))
    song_count, max_updated_at = sig_result.one()
    signature = (int(song_count or 0), max_updated_at)

    if _cache_items is not None and _cache_signature == signature:
        return _cache_items

    async with _cache_lock:
        if _cache_items is not None and _cache_signature == signature:
            return _cache_items

        rows_result = await db.execute(
            select(Song.id, Song.title, Artist.name, Album.title)
            .join(Artist, Song.artist_id == Artist.id)
            .outerjoin(Album, Song.album_id == Album.id)
        )
        items: list[dict[str, Any]] = []

        for song_id, title, artist_name, album_title in rows_result.all():
            title_norm = normalize_text(title)
            artist_norm = normalize_text(artist_name)
            album_norm = normalize_text(album_title)
            combo_norm = make_combo_norm(album_title, title)

            # A second combo variant can help when the user searches by artist.
            artist_title_norm = normalize_text(f"{artist_name} | {title}")

            items.append(
                {
                    "id": int(song_id),
                    "title": title or "",
                    "artist_name": artist_name or "",
                    "album_title": album_title or "",
                    "title_norm": title_norm,
                    "artist_norm": artist_norm,
                    "album_norm": album_norm,
                    "combo_norm": combo_norm,
                    "artist_title_norm": artist_title_norm,
                }
            )

        _cache_signature = signature
        _cache_items = items
        return items
