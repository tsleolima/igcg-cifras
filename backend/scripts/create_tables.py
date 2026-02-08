"""
Script to create all database tables directly from SQLAlchemy models
No migrations needed - use this for initial setup

Run: python scripts/create_tables.py
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import engine
from app.db.sqlite_schema import ensure_sqlite_schema
from app.models.base import Base

# Import all models to register them
from app.models import (
    User,
    Song,
    Artist,
    Album,
    Playlist,
    PlaylistSong,
    UserFavorite,
    PlayHistory,
)


async def create_tables():
    """Create all tables in the database"""
    print("🗄️  Criando tabelas no banco de dados...")
    print()

    async with engine.begin() as conn:
        # Drop all tables (careful in production!)
        # await conn.run_sync(Base.metadata.drop_all)
        # print("🗑️  Tabelas antigas removidas")

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Tabelas criadas com sucesso!")

    # SQLite dev databases don't get new columns via create_all; patch schema drift.
    await ensure_sqlite_schema(engine)

    print()
    print("📋 Tabelas criadas:")
    for table_name in Base.metadata.tables.keys():
        print(f"   - {table_name}")

    print()
    print("🎉 Banco de dados pronto!")
    print()
    print("📝 Próximos passos:")
    print("   1. python scripts/init_db.py           # Criar artista e admin")
    print("   2. python scripts/import_songs_from_json.py  # Importar músicas")


async def drop_all_tables():
    """Drop all tables - USE WITH CAUTION!"""
    print("⚠️  ATENÇÃO: Isso vai APAGAR todas as tabelas!")
    confirm = input("Digite 'CONFIRMAR' para continuar: ")

    if confirm != "CONFIRMAR":
        print("❌ Operação cancelada")
        return

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        print("🗑️  Todas as tabelas foram removidas")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Create database tables")
    parser.add_argument(
        "--drop", action="store_true", help="Drop all tables first (DANGEROUS!)"
    )

    args = parser.parse_args()

    if args.drop:
        asyncio.run(drop_all_tables())
    else:
        asyncio.run(create_tables())
