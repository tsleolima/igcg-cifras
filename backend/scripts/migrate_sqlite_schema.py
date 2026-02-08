"""Apply lightweight schema updates for SQLite dev databases.

SQLite doesn't support ALTERing many aspects of schema, but we can safely ADD
nullable columns when the SQLAlchemy models evolve.

Run:
  python scripts/migrate_sqlite_schema.py
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import engine
from app.db.sqlite_schema import ensure_sqlite_schema


async def main() -> None:
    await ensure_sqlite_schema(engine)
    print("✅ SQLite schema check complete")


if __name__ == "__main__":
    asyncio.run(main())
