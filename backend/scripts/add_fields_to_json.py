"""
Script auxiliar para adicionar campos language, lyrics e lyrics_with_chords ao db.json
Útil para preparar o JSON antes da importação

Run: python scripts/add_fields_to_json.py
"""
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def detect_language_from_title(title: str) -> str:
    """Simple language detection from title"""
    text = title.lower()

    english_words = ["the", "and", "for", "with", "worship", "praise", "glory", "grace"]
    spanish_words = ["el", "la", "los", "las", "del", "por", "para", "con", "dios"]

    # Count indicators
    en_count = sum(1 for word in english_words if word in text)
    es_count = sum(1 for word in spanish_words if word in text)

    if en_count > 0 and en_count > es_count:
        return "en"
    elif es_count > 0:
        return "es"

    return "pt"  # Default Portuguese


def add_fields_to_json(
    input_file: str = "db.json",
    output_file: str = "db_updated.json",
    default_language: str = "pt",
    auto_detect: bool = True,
):
    """Add language, lyrics and lyrics_with_chords fields to db.json"""

    print(f"📖 Lendo {input_file}...")

    try:
        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Arquivo não encontrado: {input_file}")
        return
    except json.JSONDecodeError as e:
        print(f"❌ Erro ao ler JSON: {e}")
        return

    songs = data.get("slug", [])
    total = len(songs)

    print(f"📊 Total de músicas: {total}")
    print()

    # Statistics
    stats = {"pt": 0, "en": 0, "es": 0, "other": 0}
    updated = 0
    already_have = 0

    for song in songs:
        # Check if already has the fields
        if "language" in song and song["language"]:
            already_have += 1
            stats[song["language"]] = stats.get(song["language"], 0) + 1

            # Add lyrics fields if not present
            if "lyrics" not in song:
                song["lyrics"] = None
            if "lyrics_with_chords" not in song:
                song["lyrics_with_chords"] = None
            continue

        # Auto-detect or use default
        if auto_detect:
            title = song.get("title", "")
            detected = detect_language_from_title(title)
            song["language"] = detected
            stats[detected] = stats.get(detected, 0) + 1
        else:
            song["language"] = default_language
            stats[default_language] = stats.get(default_language, 0) + 1

        # Add lyrics fields (null for now)
        song["lyrics"] = None
        song["lyrics_with_chords"] = None

        updated += 1

    print(f"✅ Músicas atualizadas: {updated}")
    print(f"⏭️  Já tinham language: {already_have}")
    print()
    print("📊 Distribuição por idioma:")
    for lang, count in sorted(stats.items(), key=lambda x: x[1], reverse=True):
        lang_name = {
            "pt": "Português",
            "en": "Inglês",
            "es": "Espanhol",
        }.get(lang, lang)
        print(f"   {lang_name} ({lang}): {count}")

    # Save updated JSON
    print()
    print(f"💾 Salvando em {output_file}...")

    try:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"✅ Arquivo salvo com sucesso!")
        print()
        print(f"📝 Próximos passos:")
        print(f"   1. Revisar o arquivo: {output_file}")
        print(f"   2. Se estiver ok, substituir: mv {output_file} {input_file}")
        print(f"   3. Adicionar letras manualmente onde necessário")
        print(f"   4. Importar: python scripts/import_songs_from_json.py")

    except Exception as e:
        print(f"❌ Erro ao salvar arquivo: {e}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Add language, lyrics and lyrics_with_chords fields to db.json"
    )
    parser.add_argument(
        "--input",
        default="db.json",
        help="Input JSON file (default: db.json)",
    )
    parser.add_argument(
        "--output",
        default="db_updated.json",
        help="Output JSON file (default: db_updated.json)",
    )
    parser.add_argument(
        "--language",
        default="pt",
        choices=["pt", "en", "es"],
        help="Default language if not auto-detecting (default: pt)",
    )
    parser.add_argument(
        "--no-auto-detect",
        action="store_true",
        help="Don't auto-detect language, use default for all",
    )

    args = parser.parse_args()

    add_fields_to_json(
        input_file=args.input,
        output_file=args.output,
        default_language=args.language,
        auto_detect=not args.no_auto_detect,
    )
