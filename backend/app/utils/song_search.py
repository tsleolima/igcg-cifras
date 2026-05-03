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


def rank_song_search_ids(
    index: list[dict[str, Any]],
    query: str | None,
    *,
    fuzzy: bool = True,
    min_score: int = 72,
) -> list[int]:
    q_norm = normalize_text(query)
    if not q_norm:
        return []

    tokens = [token for token in q_norm.split() if token]
    scores: dict[int, int] = {}
    insertion_order: dict[int, int] = {}
    play_counts: dict[int, int] = {}

    def register(song_id: int, score: int, position: int, play_count: int) -> None:
        current = scores.get(song_id)
        if current is None or score > current:
            scores[song_id] = score
        insertion_order.setdefault(song_id, position)
        play_counts[song_id] = play_count

    for position, item in enumerate(index):
        song_id = int(item["id"])
        play_count = int(item.get("play_count") or 0)
        title_norm = item.get("title_norm") or ""
        artist_norm = item.get("artist_norm") or ""
        album_norm = item.get("album_norm") or ""
        genre_norm = item.get("genre_norm") or ""
        combo_norm = item.get("combo_norm") or ""
        artist_title_norm = item.get("artist_title_norm") or ""
        lyrics_norm = item.get("lyrics_norm") or ""
        search_blob_norm = item.get("search_blob_norm") or ""

        direct_score = 0
        if title_norm == q_norm:
            direct_score = max(direct_score, 1200)
        elif q_norm in title_norm:
            direct_score = max(direct_score, 1120)

        if artist_title_norm and q_norm in artist_title_norm:
            direct_score = max(direct_score, 1060)
        if combo_norm and q_norm in combo_norm:
            direct_score = max(direct_score, 1020)
        if artist_norm and q_norm in artist_norm:
            direct_score = max(direct_score, 940)
        if album_norm and q_norm in album_norm:
            direct_score = max(direct_score, 900)
        if genre_norm and q_norm in genre_norm:
            direct_score = max(direct_score, 860)
        if lyrics_norm and q_norm in lyrics_norm:
            direct_score = max(direct_score, 980)

        if not direct_score and tokens and search_blob_norm:
            token_hits = sum(1 for token in tokens if token in search_blob_norm)
            if token_hits == len(tokens):
                direct_score = max(direct_score, 820 + token_hits * 8)
            elif token_hits >= max(2, (len(tokens) + 1) // 2):
                direct_score = max(direct_score, 740 + token_hits * 8)

        if direct_score:
            register(song_id, direct_score, position, play_count)

    if fuzzy and q_norm:
        try:
            from rapidfuzz import fuzz, process

            choices: list[str] = []
            choice_to_song: dict[str, tuple[int, int]] = {}
            field_bonus = {
                "title_norm": 90,
                "artist_title_norm": 70,
                "combo_norm": 60,
                "artist_norm": 35,
                "album_norm": 25,
            }

            for position, item in enumerate(index):
                song_id = int(item["id"])
                play_count = int(item.get("play_count") or 0)
                for key in ("title_norm", "artist_title_norm", "combo_norm", "artist_norm", "album_norm"):
                    value = item.get(key) or ""
                    if not value:
                        continue
                    choice = f"{key}:::{song_id}:::{value}"
                    choices.append(choice)
                    choice_to_song[choice] = (position, play_count)

            extracted = process.extract(
                q_norm,
                choices,
                scorer=fuzz.WRatio,
                limit=min(2000, max(100, len(choices))),
            )

            for choice, score, _ in extracted:
                if score is None or float(score) < float(min_score):
                    continue
                key, song_id_raw, _ = choice.split(":::", 2)
                song_id = int(song_id_raw)
                position, play_count = choice_to_song[choice]
                fuzzy_score = 600 + int(float(score)) + field_bonus.get(key, 0)
                register(song_id, fuzzy_score, position, play_count)
        except Exception:
            pass

    ranked_song_ids = sorted(
        scores,
        key=lambda song_id: (
            -scores[song_id],
            -play_counts.get(song_id, 0),
            insertion_order.get(song_id, 0),
        ),
    )
    return ranked_song_ids


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
            select(
                Song.id,
                Song.title,
                Artist.name,
                Album.title,
                Song.genre,
                Song.lyrics,
                Song.play_count,
            )
            .join(Artist, Song.artist_id == Artist.id)
            .outerjoin(Album, Song.album_id == Album.id)
        )
        items: list[dict[str, Any]] = []

        for (
            song_id,
            title,
            artist_name,
            album_title,
            genre,
            lyrics,
            play_count,
        ) in rows_result.all():
            title_norm = normalize_text(title)
            artist_norm = normalize_text(artist_name)
            album_norm = normalize_text(album_title)
            genre_norm = normalize_text(genre)
            lyrics_norm = normalize_text(lyrics)
            combo_norm = make_combo_norm(album_title, title)

            # A second combo variant can help when the user searches by artist.
            artist_title_norm = normalize_text(f"{artist_name} | {title}")
            search_blob_norm = normalize_text(
                " | ".join(
                    part
                    for part in (
                        title,
                        artist_name,
                        album_title,
                        genre,
                        lyrics,
                    )
                    if part
                )
            )

            items.append(
                {
                    "id": int(song_id),
                    "title": title or "",
                    "artist_name": artist_name or "",
                    "album_title": album_title or "",
                    "play_count": int(play_count or 0),
                    "title_norm": title_norm,
                    "artist_norm": artist_norm,
                    "album_norm": album_norm,
                    "genre_norm": genre_norm,
                    "lyrics_norm": lyrics_norm,
                    "combo_norm": combo_norm,
                    "artist_title_norm": artist_title_norm,
                    "search_blob_norm": search_blob_norm,
                }
            )

        _cache_signature = signature
        _cache_items = items
        return items
