"""Reset the SQLite dev database and import df_final.csv.

This is the simplest way to eliminate duplicates during development:
- Deletes the SQLite file (default: ./igcgmusic.dev.db)
- Recreates tables from SQLAlchemy models
- Seeds base data (artist id=1 + admin)
- Imports hymns from hinos-musicas/df_final.csv (with albums)

Run:
  python scripts/reset_sqlite_dev_db_from_df_final.py

WARNING: This deletes your local SQLite dev DB.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from urllib.parse import unquote

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.core.config import settings
from app.db.session import engine
from app.db.sqlite_schema import ensure_sqlite_schema
from app.models.base import Base


def _sqlite_db_file_from_url(database_url: str) -> Path | None:
    if not database_url.startswith("sqlite"):
        return None

    # Handle:
    # - sqlite+aiosqlite:///./igcgmusic.dev.db
    # - sqlite+aiosqlite:///C:/path/to/db.db
    # - sqlite+aiosqlite:///:memory:
    if ":memory:" in database_url:
        return None

    marker = ":///"
    if marker not in database_url:
        return None

    raw_path = database_url.split(marker, 1)[1]
    raw_path = unquote(raw_path)

    # SQLAlchemy URLs often yield paths like '/C:/...' on Windows
    if raw_path.startswith("/") and len(raw_path) > 3 and raw_path[2] == ":":
        raw_path = raw_path[1:]

    path = Path(raw_path)
    if not path.is_absolute():
        path = (project_root / path).resolve()

    return path


async def _recreate_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


async def main() -> None:
    db_file = _sqlite_db_file_from_url(settings.DATABASE_URL)
    if db_file is None:
        raise SystemExit(
            "This reset script only supports file-based SQLite DATABASE_URL values.\n"
            f"Current DATABASE_URL: {settings.DATABASE_URL}"
        )

    print(f"🧨 Resetting SQLite dev DB: {db_file}")

    # Ensure our own connections are closed so Windows can delete the file.
    await engine.dispose()

    deleted_file = False
    if db_file.exists():
        try:
            db_file.unlink()
            deleted_file = True
            print("✅ Deleted SQLite file")
        except PermissionError as exc:
            # Common on Windows if another process has the DB open (uvicorn, SQLite viewer, etc.)
            print(
                "⚠️  Could not delete SQLite file (it is in use). "
                "Falling back to in-place reset (drop_all/create_all).\n"
                f"   Details: {exc}"
            )
    else:
        print("ℹ️  SQLite file did not exist; creating new")

    # Recreate schema (works whether file was deleted or not)
    try:
        await _recreate_tables()
        await ensure_sqlite_schema(engine)
    except Exception as exc:
        raise SystemExit(
            "Failed to reset the SQLite schema.\n"
            "Make sure no other process is using the DB file (stop the API server, close SQLite viewers), then retry.\n"
            f"DB file: {db_file}\n"
            f"Error: {exc}"
        )

    print("✅ Tables created" + (" (new file)" if deleted_file else ""))

    # Seed base data
    from scripts.init_db import main as init_db_main

    await init_db_main()

    # Import CSV
    from scripts.import_df_final_with_albums import main as import_df_final_main

    await import_df_final_main()

    print("\n🎉 Done. Your songs/albums now reflect df_final.csv")


if __name__ == "__main__":
    asyncio.run(main())
