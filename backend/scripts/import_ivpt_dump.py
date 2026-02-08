"""Import songs from a JSON dump in hinos-musicas/.

This importer populates all songs under a single artist named "IVPT".

Imported Song fields:
- title
- categories: [{name, taxonomy}, ...] (from item.categories)
- cifra_content: item.tcm_params.cifraContent (fallback: item.lyrics_chords_text)
- original_key: item.tcm_params.originalKey
- rhythm: item.ui_fields.rhythm
- introduction: item.ui_fields.introduction
- pdf_view_url: item.sheet_links.pdf_view_url

Notes:
- This project creates tables directly from SQLAlchemy models (no migrations).
  If you already have a DB file, drop & recreate tables so new columns exist.
"""

import asyncio
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.artist import Artist
from app.models.song import Song


IVPT_ARTIST_NAME = "IVPT"
DEFAULT_DIR = Path("hinos-musicas")


def _find_default_json() -> Path:
    """Pick a default JSON dump from hinos-musicas/ without hardcoding a filename."""
    if not DEFAULT_DIR.exists():
        return DEFAULT_DIR / "dump.json"

    candidates = sorted([p for p in DEFAULT_DIR.glob("*.json") if p.is_file()], key=lambda p: p.stat().st_size, reverse=True)
    return candidates[0] if candidates else (DEFAULT_DIR / "dump.json")


def _simplify_categories(raw) -> list[dict] | None:
    if not raw or not isinstance(raw, list):
        return None

    simplified: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for c in raw:
        if not isinstance(c, dict):
            continue
        name = c.get("name")
        taxonomy = c.get("taxonomy")
        if not name or not taxonomy:
            continue
        key = (str(name), str(taxonomy))
        if key in seen:
            continue
        seen.add(key)
        simplified.append({"name": str(name), "taxonomy": str(taxonomy)})

    return simplified or None


def _extract_fields(item: dict) -> dict:
    title = item.get("title")

    categories = _simplify_categories(item.get("categories"))

    tcm = item.get("tcm_params")
    if not isinstance(tcm, dict):
        tcm = {}

    ui = item.get("ui_fields")
    if not isinstance(ui, dict):
        ui = {}

    sheet = item.get("sheet_links")
    if not isinstance(sheet, dict):
        sheet = {}

    cifra_content = (
        tcm.get("cifraContent")
        or tcm.get("cifracontent")
        or item.get("lyrics_chords_text")
    )

    original_key = tcm.get("originalKey") or tcm.get("originalkey")
    rhythm = ui.get("rhythm")
    introduction = ui.get("introduction")
    pdf_view_url = sheet.get("pdf_view_url")

    return {
        "title": title,
        "categories": categories,
        "cifra_content": cifra_content,
        "original_key": original_key,
        "rhythm": rhythm,
        "introduction": introduction,
        "pdf_view_url": pdf_view_url,
    }


async def _get_or_create_artist(db) -> Artist:
    result = await db.execute(select(Artist).where(Artist.name == IVPT_ARTIST_NAME))
    artist = result.scalar_one_or_none()
    if artist:
        return artist

    artist = Artist(name=IVPT_ARTIST_NAME)
    db.add(artist)
    await db.commit()
    await db.refresh(artist)
    return artist


async def import_dump(json_path: Path, batch_size: int = 200):
    if not json_path.exists():
        raise FileNotFoundError(f"JSON not found: {json_path}")

    data = json.loads(json_path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Expected top-level JSON array")

    total = len(data)
    print(f"🎵 Importando {total} músicas para o artista {IVPT_ARTIST_NAME}...")

    created = 0
    updated = 0
    skipped = 0

    async with AsyncSessionLocal() as db:
        artist = await _get_or_create_artist(db)

        for i in range(0, total, batch_size):
            batch = data[i : i + batch_size]

            for item in batch:
                if not isinstance(item, dict):
                    skipped += 1
                    continue

                fields = _extract_fields(item)
                title = fields.get("title")
                if not title:
                    skipped += 1
                    continue

                # Deduplicate by (artist_id, title)
                result = await db.execute(
                    select(Song).where(Song.artist_id == artist.id, Song.title == title)
                )
                song = result.scalar_one_or_none()

                if song is None:
                    song = Song(
                        title=title,
                        # Keep existing required columns satisfied for current API.
                        duration=1,
                        audio_url="",
                        cover_url=None,
                        lyrics=None,
                        lyrics_with_chords=fields.get("cifra_content"),
                        language=None,
                        genre=None,
                        artist_id=artist.id,
                        album_id=None,
                    )
                    db.add(song)
                    created += 1
                else:
                    updated += 1

                song.categories = fields.get("categories")
                song.cifra_content = fields.get("cifra_content")
                song.original_key = fields.get("original_key")
                song.rhythm = fields.get("rhythm")
                song.introduction = fields.get("introduction")
                song.pdf_view_url = fields.get("pdf_view_url")
                song.lyrics_with_chords = fields.get("cifra_content")

            await db.commit()
            print(f"✅ {min(i + batch_size, total)}/{total} processadas")

    print("✨ Import concluído")
    print(f"   ➕ criadas: {created}")
    print(f"   ♻️  atualizadas: {updated}")
    print(f"   ⏭️  puladas: {skipped}")


if __name__ == "__main__":
    import argparse

    default_file = _find_default_json()

    parser = argparse.ArgumentParser(description="Import hymns dump JSON")
    parser.add_argument("--file", default=str(default_file), help="Path to the JSON dump")
    parser.add_argument("--batch-size", type=int, default=200)

    args = parser.parse_args()
    asyncio.run(import_dump(Path(args.file), args.batch_size))
