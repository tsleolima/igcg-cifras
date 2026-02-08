"""List albums from the database.

This script is useful to debug album registration issues (duplicates, ordering,
wrong years, etc.). It uses the same database configuration as the API via
`app.core.config.settings` (DATABASE_URL).

Examples:
  python scripts/list_albums.py
  python scripts/list_albums.py --all
  python scripts/list_albums.py --limit 200
  python scripts/list_albums.py --csv backend_albums.csv

Notes:
- By default, filters to the church artist (CHURCH_ARTIST_ID), matching the API.
- Use --all to list albums from all artists.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import sys
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select

# Ensure `app/` is importable when running as a script
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.core.constants import CHURCH_ARTIST_ID
from app.db.session import AsyncSessionLocal, engine
from app.models.album import Album


@dataclass(frozen=True)
class AlbumRow:
    id: int
    title: str
    release_year: int | None
    artist_id: int
    cover_url: str | None
    created_at: str | None


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="List albums from the configured database")
    parser.add_argument("--all", action="store_true", help="List albums for all artists (do not filter to CHURCH_ARTIST_ID)")
    parser.add_argument("--limit", type=int, default=0, help="Max number of rows to print (0 = no limit)")
    parser.add_argument("--csv", type=str, default="", help="If provided, writes results to a CSV file")
    parser.add_argument(
        "--names",
        type=str,
        default="",
        help="If provided, writes only album titles (one per line) to a UTF-8 .txt file",
    )
    return parser.parse_args()


def _format_table(rows: list[AlbumRow]) -> str:
    # Simple fixed-width formatting (no external deps)
    id_w = max(2, *(len(str(r.id)) for r in rows)) if rows else 2
    year_w = 4
    artist_w = max(6, *(len(str(r.artist_id)) for r in rows)) if rows else 6

    header = f"{'ID'.ljust(id_w)}  {'YEAR'.ljust(year_w)}  {'ARTIST'.ljust(artist_w)}  TITLE"
    sep = "-" * len(header)

    lines = [header, sep]
    for r in rows:
        year = "" if r.release_year is None else str(r.release_year)
        lines.append(f"{str(r.id).ljust(id_w)}  {year.ljust(year_w)}  {str(r.artist_id).ljust(artist_w)}  {r.title}")

    return "\n".join(lines)


async def _fetch_albums(*, include_all_artists: bool) -> list[AlbumRow]:
    query = select(Album)

    if not include_all_artists:
        query = query.where(Album.artist_id == CHURCH_ARTIST_ID)

    query = query.order_by(Album.release_year.desc().nullslast(), Album.title)

    async with AsyncSessionLocal() as db:
        result = await db.execute(query)
        albums = result.scalars().all()

    rows: list[AlbumRow] = []
    for a in albums:
        rows.append(
            AlbumRow(
                id=int(a.id),
                title=str(a.title),
                release_year=None if a.release_year is None else int(a.release_year),
                artist_id=int(a.artist_id),
                cover_url=None if a.cover_url is None else str(a.cover_url),
                created_at=str(a.created_at) if getattr(a, "created_at", None) is not None else None,
            )
        )

    return rows


def _write_csv(path: Path, rows: list[AlbumRow]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["id", "title", "release_year", "artist_id", "cover_url", "created_at"],
        )
        writer.writeheader()
        for r in rows:
            writer.writerow(
                {
                    "id": r.id,
                    "title": r.title,
                    "release_year": r.release_year,
                    "artist_id": r.artist_id,
                    "cover_url": r.cover_url,
                    "created_at": r.created_at,
                }
            )


def _write_names(path: Path, rows: list[AlbumRow]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(r.title)
            f.write("\n")


async def main() -> int:
    args = _parse_args()

    rows = await _fetch_albums(include_all_artists=bool(args.all))

    if args.csv:
        _write_csv(Path(args.csv), rows)

    if args.names:
        _write_names(Path(args.names), rows)

    to_print = rows
    if args.limit and args.limit > 0:
        to_print = rows[: args.limit]

    print(f"Albums encontrados: {len(rows)}")
    if args.csv:
        print(f"CSV gerado em: {args.csv}")
    if args.names:
        print(f"Lista de nomes gerada em: {args.names}")

    if to_print:
        print()
        print(_format_table(to_print))

    # Close pooled connections (helps on Windows/SQLite)
    await engine.dispose()

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
