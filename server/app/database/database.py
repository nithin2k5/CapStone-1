from collections.abc import AsyncGenerator

from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# create_all builds missing tables but never alters existing ones, and no migration
# tool is wired up yet. Until Alembic is in place, columns added after a database
# was first created are applied here so an existing deployment keeps working.
# Names are fixed constants, never request data.
ADDED_COLUMNS: dict[str, dict[str, str]] = {
    "scan_results": {"perceptual_score": "FLOAT DEFAULT 0"},
}


def _add_missing_columns(connection) -> None:
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())

    for table, columns in ADDED_COLUMNS.items():
        if table not in tables:
            continue
        present = {column["name"] for column in inspector.get_columns(table)}
        for name, definition in columns.items():
            if name in present:
                continue
            connection.exec_driver_sql(
                f"ALTER TABLE {table} ADD COLUMN {name} {definition}"
            )


async def init_db() -> None:
    from app.database.models import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_add_missing_columns)
