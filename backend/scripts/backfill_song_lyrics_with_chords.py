"""Backfill `songs.lyrics_with_chords` removing HTML/escape artifacts while preserving chords.

Run:
  python scripts/backfill_song_lyrics_with_chords.py
  python scripts/backfill_song_lyrics_with_chords.py --dry-run
"""

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import select

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import AsyncSessionLocal
from app.models.song import Song
from app.utils.text import sanitize_song_lyrics_with_chords


async def backfill_song_lyrics_with_chords(*, dry_run: bool = False, only_non_empty: bool = True) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Song).order_by(Song.id))
        songs = result.scalars().all()

        updated = 0
        skipped = 0

        for song in songs:
            original = song.lyrics_with_chords
            if only_non_empty and (original is None or not str(original).strip()):
                skipped += 1
                continue

            cleaned = sanitize_song_lyrics_with_chords(original)
            if cleaned == original:
                skipped += 1
                continue

            song.lyrics_with_chords = cleaned
            updated += 1

        if dry_run:
            await db.rollback()
            print(
                f"🔎 Dry-run concluído. {updated} música(s) seriam atualizadas. {skipped} sem mudança."
            )
            return

        await db.commit()
        print(f"✅ Backfill concluído. {updated} música(s) atualizadas. {skipped} sem mudança.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Backfill cleaned chord lyrics into songs.lyrics_with_chords"
    )
    parser.add_argument("--dry-run", action="store_true", help="Only show how many rows would change")
    parser.add_argument(
        "--include-empty",
        action="store_true",
        help="Also process rows where lyrics_with_chords is empty/null",
    )
    args = parser.parse_args()

    asyncio.run(
        backfill_song_lyrics_with_chords(
            dry_run=args.dry_run,
            only_non_empty=not args.include_empty,
        )
    )
