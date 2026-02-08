"""
Import hymns from df_final.csv into the database with proper album mapping.

This script:
1. Reads hinos-musicas/df_final.csv
2. Extracts unique albums and creates/upserts them
3. Imports songs with language, link, and correct album_id
4. Handles deduplication by (artist_id, title)
"""

import asyncio
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import select

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.db.session import AsyncSessionLocal, engine
from app.db.sqlite_schema import ensure_sqlite_schema
from app.core.constants import CHURCH_ARTIST_ID, CHURCH_NAME, DEFAULT_ARTIST_BIO, DEFAULT_ARTIST_IMAGE
from app.models.song import Song
from app.models.album import Album
from app.models.artist import Artist


async def main():
    # SQLite dev databases don't get new columns via create_all; patch schema drift.
    await ensure_sqlite_schema(engine)

    # Read CSV
    csv_path = project_root / "hinos-musicas" / "df_final.csv"
    if not csv_path.exists():
        print(f"❌ CSV not found: {csv_path}")
        return

    df = pd.read_csv(csv_path)
    print(f"📖 Loaded {len(df)} rows from df_final.csv")
    print(f"   Columns: {list(df.columns)}")

    # Get or create church artist (stable id=1)
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Artist).where(Artist.id == CHURCH_ARTIST_ID))
        artist = result.scalars().first()
        if not artist:
            artist = Artist(
                id=CHURCH_ARTIST_ID,
                name=CHURCH_NAME,
                bio=DEFAULT_ARTIST_BIO,
                image_url=DEFAULT_ARTIST_IMAGE,
            )
            session.add(artist)
            await session.commit()
            await session.refresh(artist)
            print(f"✅ Created artist: {artist.name} (id={artist.id})")
        else:
            print(f"✅ Using existing artist: {artist.name} (id={artist.id})")

        artist_id = artist.id

        # Extract unique albums from df_final
        df_albums = df.dropna(subset=["album_name"])
        unique_albums = df_albums["album_name"].unique()
        print(f"\n🎵 Found {len(unique_albums)} unique albums")

        album_map = {}  # album_name -> album_id

        for album_name in unique_albums:
            album_name = str(album_name).strip()
            if not album_name or album_name.lower() == "nan":
                album_map[album_name] = None
                continue

            # Check if album exists
            result = await session.execute(
                select(Album).where(
                    (Album.title == album_name) & (Album.artist_id == artist_id)
                )
            )
            album = result.scalars().first()

            if not album:
                album = Album(title=album_name, artist_id=artist_id)
                session.add(album)
                await session.flush()
                print(f"  ➕ Created album: {album.title}")
            else:
                print(f"  ♻️  Using album: {album.title} (id={album.id})")

            album_map[album_name] = album.id

        await session.commit()
        print(f"✅ {len(album_map)} albums ready")

        # Import songs
        print(f"\n🎵 Importing songs...")
        inserted = 0
        updated = 0
        skipped = 0

        for idx, row in df.iterrows():
            title = str(row.get("title", "")).strip()
            if not title:
                skipped += 1
                continue

            # Check if song already exists (by artist_id + title)
            result = await session.execute(
                select(Song).where(
                    (Song.artist_id == artist_id) & (Song.title == title)
                )
            )
            existing = result.scalars().first()

            # Extract fields
            album_name = str(row.get("album_name", "") or "").strip()
            album_id = album_map.get(album_name)

            language = str(row.get("language", "")) or None
            link = str(row.get("link", "")) or None

            # Parse categories if present
            categories = None
            try:
                cat_str = row.get("categories")
                if cat_str and pd.notna(cat_str):
                    import ast
                    categories = ast.literal_eval(cat_str)
            except Exception:
                pass

            # Parse sheet_links if present
            pdf_url = None
            try:
                sheet_str = row.get("sheet_links")
                if sheet_str and pd.notna(sheet_str):
                    import ast
                    sheet_dict = ast.literal_eval(sheet_str)
                    pdf_url = sheet_dict.get("pdf_view_url")
            except Exception:
                pass

            # Parse ui_fields
            original_key = None
            rhythm = None
            introduction = None
            try:
                ui_str = row.get("ui_fields")
                if ui_str and pd.notna(ui_str):
                    import ast
                    ui_dict = ast.literal_eval(ui_str)
                    original_key = ui_dict.get("original_key_ui") or ui_dict.get("original_key")
                    rhythm = ui_dict.get("rhythm")
                    introduction = ui_dict.get("introduction")
            except Exception:
                pass

            lyrics_chords = str(row.get("lyrics_chords_text", "")) or None

            song_data = {
                "title": title,
                "artist_id": artist_id,
                "album_id": album_id,
                "language": language,
                "link": link,
                "lyrics_with_chords": lyrics_chords,
                "categories": categories,
                "original_key": original_key,
                "rhythm": rhythm,
                "introduction": introduction,
                "pdf_view_url": pdf_url,
                # Required fields (defaults if not in CSV)
                "duration": int(row.get("duration", 0)) if row.get("duration") else 0,
                "audio_url": str(row.get("audio_url", "http://example.com/song.mp3")).strip(),
            }

            if existing:
                # Update existing
                for key, value in song_data.items():
                    if value is not None:
                        setattr(existing, key, value)
                updated += 1
            else:
                # Create new
                song = Song(**song_data)
                session.add(song)
                inserted += 1

            if (idx + 1) % 100 == 0:
                await session.commit()
                print(f"  ✅ Processed {idx + 1}/{len(df)} rows (inserted={inserted}, updated={updated})")

        await session.commit()
        print(f"\n✅ Import complete!")
        print(f"   Inserted: {inserted}")
        print(f"   Updated: {updated}")
        print(f"   Skipped: {skipped}")


if __name__ == "__main__":
    asyncio.run(main())
