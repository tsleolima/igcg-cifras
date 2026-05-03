"""Backfill `songs.lyrics` with plain text derived from formatted hymn content.

Rules applied:
- strip HTML tags
- strip chord markers in square brackets, e.g. [G], [C#m7(5b)], [G/B]
- normalize whitespace

Run:
  python scripts/backfill_song_lyrics.py
  python scripts/backfill_song_lyrics.py --dry-run
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
from app.utils.text import sanitize_song_lyrics


def choose_lyrics_source(song: Song) -> str | None:
    return song.lyrics_with_chords or song.lyrics or song.cifra_content


async def backfill_song_lyrics(*, dry_run: bool = False, only_empty: bool = False) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Song).order_by(Song.id))
        songs = result.scalars().all()

        updated = 0
        skipped = 0

        for song in songs:
            if only_empty and song.lyrics:
                skipped += 1
                continue

            source = choose_lyrics_source(song)
            clean_lyrics = sanitize_song_lyrics(source)

            if clean_lyrics == song.lyrics:
                skipped += 1
                continue

            song.lyrics = clean_lyrics
            updated += 1

        if dry_run:
            await db.rollback()
            print(f"🔎 Dry-run concluído. {updated} música(s) seriam atualizadas. {skipped} sem mudança.")
            return

        await db.commit()
        print(f"✅ Backfill concluído. {updated} música(s) atualizadas. {skipped} sem mudança.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill plain lyrics into songs.lyrics")
    parser.add_argument("--dry-run", action="store_true", help="Only show how many rows would change")
    parser.add_argument("--only-empty", action="store_true", help="Only fill rows where lyrics is empty")
    args = parser.parse_args()

    asyncio.run(backfill_song_lyrics(dry_run=args.dry_run, only_empty=args.only_empty))
