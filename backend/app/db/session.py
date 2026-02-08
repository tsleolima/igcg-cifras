from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool, QueuePool
from app.core.config import settings

# Create async engine
# - Postgres (prod / Supabase): use pooling for performance.
# - SQLite (dev): avoid passing pooling kwargs that SQLite doesn't support.
database_url = settings.DATABASE_URL
is_sqlite = database_url.startswith("sqlite")

engine_kwargs: dict = {
    "echo": settings.DEBUG,
    "pool_pre_ping": True,  # Verify connections before using
}

if is_sqlite:
    # SQLite is single-file; pooling often causes "database is locked" issues.
    # Also, pool_size/max_overflow/pool_timeout aren't valid for SQLite.
    engine_kwargs.update(
        {
            "poolclass": NullPool,
            "connect_args": {"check_same_thread": False},
        }
    )
else:
    engine_kwargs.update(
        {
            "poolclass": QueuePool if not settings.DEBUG else NullPool,
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT,
            "pool_recycle": settings.DB_POOL_RECYCLE,
        }
    )

engine = create_async_engine(database_url, **engine_kwargs)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncSession:
    """Dependency for getting async database sessions"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
