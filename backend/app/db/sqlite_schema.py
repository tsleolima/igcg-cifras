from __future__ import annotations

from collections.abc import Mapping

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncConnection


# Columns we may add over time for SQLite dev databases.
# SQLite doesn't enforce column types strictly; use simple type names.
_SQLITE_SONG_COLUMNS: Mapping[str, str] = {
    # Lyrics / metadata
    "lyrics_with_chords": "TEXT",
    "language": "VARCHAR(10)",
    "link": "VARCHAR(500)",
    "source_url": "VARCHAR(500)",
    # Hymn/cifra metadata
    "categories": "JSON",
    "cifra_content": "TEXT",
    "original_key": "VARCHAR(20)",
    "rhythm": "VARCHAR(100)",
    "introduction": "TEXT",
    "pdf_view_url": "VARCHAR(500)",
}


async def _sqlite_table_exists(conn: AsyncConnection, table_name: str) -> bool:
    result = await conn.exec_driver_sql(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?;",
        (table_name,),
    )
    return result.first() is not None


async def _sqlite_column_names(conn: AsyncConnection, table_name: str) -> set[str]:
    result = await conn.exec_driver_sql(f"PRAGMA table_info({table_name});")
    # PRAGMA table_info returns rows:
    # (cid, name, type, notnull, dflt_value, pk)
    rows = result.fetchall()
    return {str(row[1]) for row in rows}


async def _sqlite_add_columns(
    conn: AsyncConnection, *, table_name: str, columns: Mapping[str, str]
) -> int:
    existing = await _sqlite_column_names(conn, table_name)
    added = 0

    for column_name, column_type in columns.items():
        if column_name in existing:
            continue
        await conn.exec_driver_sql(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type};"
        )
        added += 1

    return added


async def ensure_sqlite_schema(engine: AsyncEngine) -> None:
    """Best-effort schema drift fix for SQLite dev databases.

    Notes:
    - `Base.metadata.create_all` does not add columns to existing SQLite tables.
    - This function keeps existing data and only adds nullable columns.
    """

    if engine.dialect.name != "sqlite":
        return

    async with engine.begin() as conn:
        if not await _sqlite_table_exists(conn, "songs"):
            return

        await _sqlite_add_columns(conn, table_name="songs", columns=_SQLITE_SONG_COLUMNS)
