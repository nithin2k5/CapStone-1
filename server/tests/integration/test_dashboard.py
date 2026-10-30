"""
The overview's counts and activity chart.

Both read wrong once real mail flowed: "scanned" counted only the SCANNED
status, which a finished scan replaces with its verdict, and the chart kept the
oldest 24 hourly buckets, so it never reached today.
"""

import uuid
from datetime import datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.dashboard import get_dashboard
from app.database.models import Base, Email, EmailStatus, User

NOW = datetime(2026, 10, 30, 9, 0)


@pytest.fixture
async def db(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path}/test.sqlite3")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        yield session
    await engine.dispose()


async def _user(db) -> User:
    user = User(id=uuid.uuid4(), name="n", email=f"{uuid.uuid4()}@example.com", hashed_password="h")
    db.add(user)
    await db.commit()
    return user


def _email(user, status, created_at) -> Email:
    return Email(
        user_id=user.id,
        gmail_message_id=uuid.uuid4().hex,
        sender="a@example.com",
        recipient="me@example.com",
        status=status,
        created_at=created_at,
    )


@pytest.mark.asyncio
class TestOverview:
    async def test_scanned_counts_every_message_with_a_verdict(self, db):
        user = await _user(db)
        for status in (EmailStatus.SAFE, EmailStatus.QUARANTINED, EmailStatus.BLOCKED, EmailStatus.PENDING):
            db.add(_email(user, status, NOW))
        await db.commit()

        stats = await get_dashboard(current_user=user, db=db)

        assert stats.total_emails == 4
        assert stats.scanned_emails == 3

    async def test_the_chart_keeps_the_newest_24_hours_in_time_order(self, db):
        user = await _user(db)
        # 30 distinct hourly buckets, the oldest a month back.
        for hours_ago in range(30):
            db.add(_email(user, EmailStatus.SAFE, NOW - timedelta(days=30) + timedelta(hours=hours_ago)))
        db.add(_email(user, EmailStatus.SAFE, NOW))
        await db.commit()

        stats = await get_dashboard(current_user=user, db=db)
        labels = [m.month for m in stats.monthly_statistics]

        assert len(labels) == 24
        assert labels[-1] == NOW.strftime("%m-%d %H:00")
        assert labels == sorted(labels)
