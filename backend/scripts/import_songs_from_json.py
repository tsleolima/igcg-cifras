"""
Script to import songs from db.json into PostgreSQL database
Run after: python scripts/init_db.py

Strategy:
1. Parse db.json
2. Extract album name from title (before |)
3. Create albums dynamically
4. Import songs with proper relations
5. Detect language from title/description
6. Support batch inserts for performance
"""
import asyncio
import sys
import json
from pathlib import Path
from datetime import datetime
import re

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.artist import Artist
from app.models.album import Album
from app.models.song import Song
from app.core.constants import CHURCH_ARTIST_ID


def extract_album_and_song_title(full_title: str) -> tuple[str, str]:
    """
    Extract album and song title from format: 'CD Album Name | Song Name'
    Examples:
        'CD O Valor de Um Grande Amor | A Benção de Abraão'
        -> ('O Valor de Um Grande Amor', 'A Benção de Abraão')
    """
    if " | " in full_title:
        parts = full_title.split(" | ", 1)
        album_part = parts[0].strip()
        song_title = parts[1].strip()

        # Remove "CD" prefix from album
        album_part = re.sub(r"^CD\s+", "", album_part, flags=re.IGNORECASE)

        return album_part, song_title
    else:
        return "Singles", full_title.strip()


def detect_language(title: str, description: str = "") -> str:
    """
    Detect language from title or description
    Default: pt (Portuguese)
    """
    text = (title + " " + description).lower()

    # Simple detection based on common words
    english_indicators = ["the", "and", "for", "with", "from", "praise", "worship"]
    spanish_indicators = ["el", "la", "los", "las", "del", "por", "para", "con"]

    if any(word in text for word in english_indicators):
        return "en"
    elif any(word in text for word in spanish_indicators):
        return "es"

    return "pt"  # Default Portuguese


async def create_or_get_album(db, album_title: str, thumbnail: str) -> int:
    """Create album if not exists, return album_id"""
    # Check if album exists
    result = await db.execute(
        select(Album).where(
            Album.title == album_title, Album.artist_id == CHURCH_ARTIST_ID
        )
    )
    album = result.scalar_one_or_none()

    if album:
        return album.id

    # Create new album
    new_album = Album(
        title=album_title,
        cover_url=thumbnail,
        artist_id=CHURCH_ARTIST_ID,
        release_year=None,  # Will be set later if needed
    )

    db.add(new_album)
    await db.flush()  # Get ID without committing
    return new_album.id


async def import_songs(json_path: str = "db.json", batch_size: int = 100):
    """Import songs from JSON file"""
    print("🎵 Iniciando importação de músicas do db.json...")
    print()

    # Load JSON
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    songs_data = data.get("slug", [])
    total = len(songs_data)

    print(f"📊 Total de músicas no JSON: {total}")
    print()

    async with AsyncSessionLocal() as db:
        # Verify artist exists
        result = await db.execute(select(Artist).where(Artist.id == CHURCH_ARTIST_ID))
        artist = result.scalar_one_or_none()

        if not artist:
            print("❌ Erro: Artista da igreja não encontrado!")
            print("   Execute primeiro: python scripts/init_db.py")
            return

        print(f"✅ Artista encontrado: {artist.name}")
        print()

        # Track albums created
        albums_cache = {}
        imported = 0
        skipped = 0
        errors = 0

        # Process in batches
        for i in range(0, total, batch_size):
            batch = songs_data[i : i + batch_size]

            for item in batch:
                try:
                    # Extract data
                    json_id = item.get("id", "")
                    full_title = item.get("title", "")
                    members = item.get("members", "")
                    thumbnail = item.get("thumbnail", "")
                    description = item.get("description", "")

                    # NEW: Extract language and lyrics from JSON
                    language = item.get("language", None)  # Read from JSON
                    lyrics = item.get("lyrics", None)
                    lyrics_with_chords = item.get("lyrics_with_chords", None)

                    file_data = item.get("file", {})
                    audio_url = file_data.get("url", "")
                    duration = file_data.get("duration", 0)

                    # Extract album and song title
                    album_title, song_title = extract_album_and_song_title(full_title)

                    # Fallback: Detect language if not in JSON
                    if not language:
                        language = detect_language(song_title, description)

                    # Get or create album
                    if album_title not in albums_cache:
                        album_id = await create_or_get_album(db, album_title, thumbnail)
                        albums_cache[album_title] = album_id
                    else:
                        album_id = albums_cache[album_title]

                    # Check if song already exists (by audio_url or title)
                    result = await db.execute(
                        select(Song).where(
                            (Song.audio_url == audio_url) | (Song.title == song_title)
                        )
                    )
                    existing = result.scalar_one_or_none()

                    if existing:
                        skipped += 1
                        continue

                    # Create song
                    song = Song(
                        title=song_title,
                        duration=duration,
                        audio_url=audio_url,
                        cover_url=thumbnail,
                        lyrics=lyrics,  # From JSON or None
                        lyrics_with_chords=lyrics_with_chords,  # From JSON or None
                        language=language,
                        genre="Gospel",  # Default genre
                        artist_id=CHURCH_ARTIST_ID,
                        album_id=album_id,
                    )

                    db.add(song)
                    imported += 1

                except Exception as e:
                    print(f"⚠️  Erro ao processar: {full_title}")
                    print(f"   {str(e)}")
                    errors += 1
                    continue

            # Commit batch
            try:
                await db.commit()
                print(
                    f"✅ Batch {i // batch_size + 1}: "
                    f"{min(i + batch_size, total)}/{total} processadas"
                )
            except Exception as e:
                await db.rollback()
                print(f"❌ Erro ao salvar batch: {e}")

    print()
    print("=" * 60)
    print(f"✨ Importação concluída!")
    print(f"   📥 Importadas: {imported}")
    print(f"   ⏭️  Ignoradas (duplicadas): {skipped}")
    print(f"   ❌ Erros: {errors}")
    print(f"   📁 Álbuns criados: {len(albums_cache)}")
    print("=" * 60)


async def show_stats():
    """Show database statistics after import"""
    async with AsyncSessionLocal() as db:
        # Count songs
        from sqlalchemy import func

        result = await db.execute(select(func.count(Song.id)))
        song_count = result.scalar()

        result = await db.execute(select(func.count(Album.id)))
        album_count = result.scalar()

        # Languages
        result = await db.execute(
            select(Song.language, func.count(Song.id))
            .group_by(Song.language)
            .order_by(func.count(Song.id).desc())
        )
        languages = result.all()

        print()
        print("📊 Estatísticas do Banco:")
        print(f"   🎵 Total de músicas: {song_count}")
        print(f"   📀 Total de álbuns: {album_count}")
        print()
        print("   🌍 Por idioma:")
        for lang, count in languages:
            lang_name = {"pt": "Português", "en": "Inglês", "es": "Espanhol"}.get(
                lang or "pt", lang or "Desconhecido"
            )
            print(f"      {lang_name}: {count}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Import songs from db.json")
    parser.add_argument(
        "--file", default="db.json", help="Path to JSON file (default: db.json)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Batch size for inserts (default: 100)",
    )
    parser.add_argument("--stats", action="store_true", help="Show statistics only")

    args = parser.parse_args()

    if args.stats:
        asyncio.run(show_stats())
    else:
        asyncio.run(import_songs(args.file, args.batch_size))
        asyncio.run(show_stats())
