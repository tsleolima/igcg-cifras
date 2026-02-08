"""Cleanup albums with useless numeric titles.

This script is intended to fix album spam created by imports/cadastro.
By default it runs in DRY-RUN mode: it only prints what it *would* delete.

Deletion is intentionally conservative and requires `--apply`.

Default matching rules (requested):
- Titles that are only digits: "01", "094", "288"...
- Titles that start with digits followed by "Hino" or "H":
  - "126 Hino-126", "171 Hino 171", "334 H 334", "283 Hino"...

Safety:
- In APPLY mode (default), it will move songs to a target album (default title: "Hinário")
    before deleting the candidate albums.
- You can also use detach mode (set songs.album_id=NULL) instead.

Examples:
  python scripts/cleanup_albums.py
  python scripts/cleanup_albums.py --out cleanup_candidates.csv
    python scripts/cleanup_albums.py --apply --backup deleted_albums_backup.csv --moved moved_songs.csv

Notes:
- By default filters to CHURCH_ARTIST_ID, matching the /albums endpoint.
  Use --all to include albums from other artists too.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import delete, func, select, update

# Ensure `app/` is importable when running as a script
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.core.constants import CHURCH_ARTIST_ID
from app.db.session import AsyncSessionLocal, engine
from app.models.album import Album
from app.models.song import Song


@dataclass(frozen=True)
class Candidate:
    id: int
    title: str
    release_year: int | None
    artist_id: int
    song_count: int
    reason: str


_NUMERIC_ONLY = re.compile(r"^\d+$")
_NUMERIC_HINO = re.compile(r"^\d+\s+Hino\b.*$", re.IGNORECASE)
_NUMERIC_H = re.compile(r"^\d+\s+H\b.*$", re.IGNORECASE)


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Cleanup albums with useless numeric titles")
    p.add_argument("--all", action="store_true", help="Do not filter to CHURCH_ARTIST_ID")
    p.add_argument("--apply", action="store_true", help="Actually apply deletion (default is dry-run)")
    p.add_argument(
        "--mode",
        choices=["move", "detach"],
        default="move",
        help="How to handle songs linked to candidate albums: move them to a target album, or detach (album_id=NULL)",
    )
    p.add_argument(
        "--target-title",
        type=str,
        default="Hinário",
        help="Target album title used in move mode (created if missing)",
    )
    p.add_argument(
        "--force-with-songs",
        action="store_true",
        help="In detach mode, allow deleting candidate albums even if songs reference them (songs will be detached)",
    )
    p.add_argument(
        "--out",
        type=str,
        default="",
        help="Write candidates (with reasons and song_count) to a CSV file",
    )
    p.add_argument(
        "--backup",
        type=str,
        default="",
        help="When applying, writes deleted albums (candidates) to this CSV before deleting",
    )
    p.add_argument(
        "--moved",
        type=str,
        default="",
        help="When applying in move mode, writes moved songs mapping to this CSV",
    )
    return p.parse_args()


def _classify_title(title: str) -> str | None:
    t = (title or "").strip()
    if not t:
        return "empty"

    if _NUMERIC_ONLY.fullmatch(t):
        return "numeric_only"

    # Only the patterns requested by the user (numeric + hino/h)
    if _NUMERIC_HINO.fullmatch(t):
        return "numeric_hino"

    if _NUMERIC_H.fullmatch(t):
        return "numeric_h"

    return None


async def _song_counts_by_album_id(album_ids: list[int]) -> dict[int, int]:
    if not album_ids:
        return {}

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Song.album_id, func.count(Song.id))
            .where(Song.album_id.in_(album_ids))
            .group_by(Song.album_id)
        )
        rows = result.all()

    counts: dict[int, int] = {}
    for album_id, count in rows:
        if album_id is None:
            continue
        counts[int(album_id)] = int(count)

    return counts


async def _find_candidates(*, include_all_artists: bool) -> list[Candidate]:
    query = select(Album)
    if not include_all_artists:
        query = query.where(Album.artist_id == CHURCH_ARTIST_ID)

    async with AsyncSessionLocal() as db:
        result = await db.execute(query)
        albums = result.scalars().all()

    # First pass: identify candidate albums
    temp: list[tuple[Album, str]] = []
    for a in albums:
        reason = _classify_title(a.title)
        if reason is None:
            continue
        temp.append((a, reason))

    # Second pass: count songs per album
    ids = [int(a.id) for a, _ in temp]
    counts = await _song_counts_by_album_id(ids)

    candidates: list[Candidate] = []
    for a, reason in temp:
        candidates.append(
            Candidate(
                id=int(a.id),
                title=str(a.title),
                release_year=None if a.release_year is None else int(a.release_year),
                artist_id=int(a.artist_id),
                song_count=int(counts.get(int(a.id), 0)),
                reason=reason,
            )
        )

    # Deterministic ordering
    candidates.sort(key=lambda c: (c.reason, -c.song_count, c.title, c.id))
    return candidates


def _write_candidates_csv(path: Path, candidates: list[Candidate]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=["id", "title", "reason", "song_count", "artist_id", "release_year"],
        )
        w.writeheader()
        for c in candidates:
            w.writerow(
                {
                    "id": c.id,
                    "title": c.title,
                    "reason": c.reason,
                    "song_count": c.song_count,
                    "artist_id": c.artist_id,
                    "release_year": c.release_year,
                }
            )


def _summarize(candidates: list[Candidate]) -> str:
    total = len(candidates)
    with_songs = sum(1 for c in candidates if c.song_count > 0)
    songs_total = sum(c.song_count for c in candidates)

    by_reason: dict[str, int] = {}
    for c in candidates:
        by_reason[c.reason] = by_reason.get(c.reason, 0) + 1

    parts = [f"Candidatos: {total}", f"Com músicas vinculadas: {with_songs}", f"Total de vínculos (songs): {songs_total}"]
    reasons = ", ".join(f"{k}={v}" for k, v in sorted(by_reason.items()))
    parts.append(f"Por motivo: {reasons}")
    return "\n".join(parts)


def _write_moved_songs_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["song_id", "old_album_id", "new_album_id", "artist_id"])
        w.writeheader()
        for r in rows:
            w.writerow(r)


async def _get_or_create_target_album_id(
    db,
    *,
    artist_id: int,
    target_title: str,
) -> int:
    # Find existing target album (prefer smallest id for determinism)
    result = await db.execute(
        select(Album).where(Album.artist_id == artist_id, Album.title == target_title).order_by(Album.id.asc())
    )
    existing = result.scalars().first()
    if existing is not None:
        return int(existing.id)

    album = Album(title=target_title, artist_id=artist_id, cover_url=None, release_year=None)
    db.add(album)
    await db.commit()
    await db.refresh(album)
    return int(album.id)


async def _apply_cleanup(
    candidates: list[Candidate],
    *,
    mode: str,
    target_title: str,
    include_all_artists: bool,
    force_with_songs: bool,
    backup_csv: str,
    moved_csv: str,
) -> dict:
    """Executes cleanup. Returns stats dict."""

    # Filter by artist if not include_all_artists (candidates are already filtered, but keep predictable)
    filtered = candidates
    if not include_all_artists:
        filtered = [c for c in candidates if c.artist_id == CHURCH_ARTIST_ID]

    if backup_csv:
        _write_candidates_csv(Path(backup_csv), filtered)

    album_ids = [c.id for c in filtered]
    if not album_ids:
        return {
            "deleted_albums": 0,
            "updated_songs": 0,
            "skipped_albums": 0,
            "target_albums": {},
        }

    moved_rows: list[dict] = []
    skipped = 0
    updated_songs = 0
    deleted_albums = 0
    target_albums: dict[int, int] = {}

    # Group candidates by artist for safe move (avoids cross-artist mixing)
    by_artist: dict[int, list[Candidate]] = {}
    for c in filtered:
        by_artist.setdefault(c.artist_id, []).append(c)

    async with AsyncSessionLocal() as db:
        if mode == "move":
            # Ensure target album per artist
            for artist_id in sorted(by_artist.keys()):
                target_albums[artist_id] = await _get_or_create_target_album_id(
                    db, artist_id=artist_id, target_title=target_title
                )

            # Move songs per artist
            for artist_id, group in by_artist.items():
                ids = [c.id for c in group]
                target_id = target_albums[artist_id]

                if moved_csv:
                    result = await db.execute(select(Song.id, Song.album_id).where(Song.album_id.in_(ids)))
                    for song_id, old_album_id in result.all():
                        moved_rows.append(
                            {
                                "song_id": int(song_id),
                                "old_album_id": int(old_album_id) if old_album_id is not None else None,
                                "new_album_id": int(target_id),
                                "artist_id": int(artist_id),
                            }
                        )

                res = await db.execute(update(Song).where(Song.album_id.in_(ids)).values(album_id=target_id))
                updated_songs += int(getattr(res, "rowcount", 0) or 0)

            # Delete albums after moving songs
            res_del = await db.execute(delete(Album).where(Album.id.in_(album_ids)))
            deleted_albums = int(getattr(res_del, "rowcount", 0) or 0)
            await db.commit()

        elif mode == "detach":
            # Detach mode keeps old behavior; only delete albums with songs if forced
            to_delete: list[int] = []
            for c in filtered:
                if c.song_count > 0 and not force_with_songs:
                    skipped += 1
                    continue
                to_delete.append(c.id)

            if to_delete:
                res = await db.execute(update(Song).where(Song.album_id.in_(to_delete)).values(album_id=None))
                updated_songs = int(getattr(res, "rowcount", 0) or 0)
                res_del = await db.execute(delete(Album).where(Album.id.in_(to_delete)))
                deleted_albums = int(getattr(res_del, "rowcount", 0) or 0)
                await db.commit()

        else:
            raise ValueError(f"Unknown mode: {mode}")

    if moved_csv and moved_rows:
        _write_moved_songs_csv(Path(moved_csv), moved_rows)

    return {
        "deleted_albums": deleted_albums,
        "updated_songs": updated_songs,
        "skipped_albums": skipped,
        "target_albums": target_albums,
        "moved_rows": len(moved_rows),
    }


async def main() -> int:
    args = _parse_args()

    candidates = await _find_candidates(include_all_artists=bool(args.all))

    print(_summarize(candidates))

    if args.out:
        _write_candidates_csv(Path(args.out), candidates)
        print(f"CSV de candidatos gerado em: {args.out}")

    # Show a short preview
    preview = candidates[:50]
    if preview:
        print("\nPreview (até 50):")
        for c in preview:
            print(f"- #{c.id} [{c.reason}] songs={c.song_count}: {c.title}")

    if not args.apply:
        print("\nDRY-RUN: nada foi deletado. Use --apply para executar.")
        await engine.dispose()
        return 0

    stats = await _apply_cleanup(
        candidates,
        mode=str(args.mode),
        target_title=str(args.target_title),
        include_all_artists=bool(args.all),
        force_with_songs=bool(args.force_with_songs),
        backup_csv=str(args.backup or ""),
        moved_csv=str(args.moved or ""),
    )

    print("\nAPPLY concluído:")
    print(f"- Mode: {args.mode}")
    if args.mode == "move":
        print(f"- Target title: {args.target_title}")
        if stats.get("target_albums"):
            pretty = ", ".join(f"artist_id={k}->album_id={v}" for k, v in sorted(stats["target_albums"].items()))
            print(f"- Target albums: {pretty}")
        if args.moved:
            print(f"- Moved songs log: {args.moved} (rows={stats.get('moved_rows', 0)})")
    print(f"- Songs atualizadas: {stats.get('updated_songs', 0)}")
    print(f"- Albums deletados: {stats.get('deleted_albums', 0)}")
    if args.mode == "detach":
        print(f"- Albums pulados (tinham songs e faltou --force-with-songs): {stats.get('skipped_albums', 0)}")

    await engine.dispose()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
