from collections.abc import AsyncGenerator
import logging

from sqlalchemy import Index, MetaData, Table, inspect, text
from sqlalchemy.engine import make_url
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
    # Existing rows predate the distinction between a verdict and its
    # enforcement, and nothing is known about whether their mailbox move
    # landed. 0 is the honest default: unenforced until one succeeds.
    "emails": {
        "enforced": "BOOLEAN NOT NULL DEFAULT 0",
        "remediated_at": "DATETIME NULL",
    },
    "users": {
        "gmail_history_id": "VARCHAR(64) NULL",
        "gmail_watch_expires_at": "DATETIME NULL",
        "google_token_expires_at": "DATETIME NULL",
        "microsoft_token_expires_at": "DATETIME NULL",
        "microsoft_delta_link": "TEXT NULL",
    },
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


def _repair_email_uniqueness(connection) -> None:
    """
    Replace the global unique index on emails.gmail_message_id with a per-user one.

    create_all never alters an existing table, so a database created before the
    constraint was scoped keeps enforcing the id globally and keeps handing the
    second user to receive a message the first user's row.
    """
    inspector = inspect(connection)
    if "emails" not in set(inspector.get_table_names()):
        return

    scoped = {"user_id", "gmail_message_id"}
    unique_sets = [
        set(index["column_names"]) for index in inspector.get_indexes("emails") if index["unique"]
    ] + [
        set(constraint["column_names"])
        for constraint in inspector.get_unique_constraints("emails")
    ]
    if scoped in unique_sets:
        return

    table = Table("emails", MetaData(), autoload_with=connection)

    for index in list(table.indexes):
        if index.unique and [column.name for column in index.columns] == ["gmail_message_id"]:
            index.drop(connection)

    # Postgres reports a unique constraint separately from its backing index.
    if connection.dialect.name == "postgresql":
        for constraint in inspector.get_unique_constraints("emails"):
            if constraint["column_names"] == ["gmail_message_id"] and constraint.get("name"):
                connection.exec_driver_sql(
                    f'ALTER TABLE emails DROP CONSTRAINT "{constraint["name"]}"'
                )

    Index(
        "uq_emails_user_message",
        table.c.user_id,
        table.c.gmail_message_id,
        unique=True,
    ).create(connection)


async def create_database_if_not_exists(url: str) -> None:
    parsed_url = make_url(str(url))
    db_name = parsed_url.database
    if not db_name or parsed_url.get_dialect().name == "sqlite":
        return

    dialect = parsed_url.get_dialect().name
    
    if dialect == "postgresql":
        temp_url = parsed_url.set(database="postgres")
    elif dialect == "mysql":
        temp_url = parsed_url.set(database="")
    else:
        return

    temp_engine = create_async_engine(temp_url, isolation_level="AUTOCOMMIT")
    
    try:
        async with temp_engine.connect() as conn:
            if dialect == "postgresql":
                result = await conn.execute(
                    text(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'")
                )
                if not result.scalar():
                    await conn.execute(text(f"CREATE DATABASE {db_name}"))
            elif dialect == "mysql":
                await conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}`"))
    except Exception as e:
        logging.warning(f"Failed to create database '{db_name}': {e}")
    finally:
        await temp_engine.dispose()


async def init_db() -> None:
    from app.database.models import Base

    await create_database_if_not_exists(settings.database_url)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_add_missing_columns)
        await conn.run_sync(_repair_email_uniqueness)
