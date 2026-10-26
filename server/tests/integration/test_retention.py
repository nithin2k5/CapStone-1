"""
Delivered mail loses its content once its day is over, and nothing else does.

The pass is destructive, so what it leaves alone is pinned as carefully as what
it erases: condemned mail keeps its evidence, today's mail keeps everything,
and the erased row keeps what sender recognition and deduplication read.
"""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database.models import Base, Email, EmailStatus, ScanResult, RiskLevel, User
from app.repositories.email_repository import EmailRepository
from app.repositories.sender_repository import SenderHistoryRepository
from app.services.remediation_service import RemediationService
from app.services.retention_service import discard_delivered_before

NOW = datetime.now(timezone.utc)
YESTERDAY = NOW - timedelta(days=1)
LAST_WEEK = NOW - timedelta(days=7)


@pytest.fixture
async def db(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path}/retention.sqlite3")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        yield session
    await engine.dispose()


async def _user(db):
    row = User(id=uuid4(), name="Test", email=f"{uuid4()}@example.test", hashed_password="x")
    db.add(row)
    await db.flush()
    return row


async def _email(db, owner, arrived, status=EmailStatus.SAFE, sender="friend@example.test"):
    row = Email(
        id=uuid4(),
        user_id=owner.id,
        gmail_message_id=str(uuid4()),
        sender=sender,
        recipient=owner.email,
        subject="Lunch?",
        body_text="See you at noon",
        body_html="<p>See you at noon</p>",
        raw_headers={"From": [sender]},
        status=status,
        risk_score=3.0,
        created_at=arrived,
    )
    db.add(row)
    await db.flush()
    db.add(
        ScanResult(
            email_id=row.id,
            header_score=0,
            url_score=0,
            attachment_score=0,
            ai_score=0,
            final_score=3.0,
            risk_level=RiskLevel.SAFE,
            findings={"detail": "kept until erased"},
        )
    )
    await db.commit()
    return row


async def _reload(db, email):
    email_id = email.id  # read before expiring, or reading it is a lazy load
    db.expire_all()
    return (
        await db.execute(select(Email).where(Email.id == email_id).execution_options(populate_existing=True))
    ).scalar_one()


async def _scan_count(db, email):
    email_id = email.id
    rows = await db.execute(select(ScanResult).where(ScanResult.email_id == email_id))
    return len(rows.all())


@pytest.mark.asyncio
class TestDailyDiscard:
    async def test_yesterdays_delivered_mail_loses_its_content(self, db):
        owner = await _user(db)
        old = await _email(db, owner, YESTERDAY)

        assert await discard_delivered_before(db, NOW) == 1

        row = await _reload(db, old)
        assert row.body_text is None and row.body_html is None and row.raw_headers is None
        assert row.discarded_at is not None
        assert await _scan_count(db, old) == 0

    async def test_the_record_survives_for_recognition_and_dedup(self, db):
        owner = await _user(db)
        owner_id = owner.id
        old = await _email(db, owner, LAST_WEEK)

        await discard_delivered_before(db, NOW)

        row = await _reload(db, old)
        assert (row.sender, row.subject, row.status, row.risk_score) == (
            "friend@example.test", "Lunch?", EmailStatus.SAFE, 3.0,
        )
        # The provider id is what stops a later sync scanning it again.
        assert await EmailRepository(db).get_by_gmail_id(row.gmail_message_id, owner_id)
        # And sender recognition still counts the contact.
        contacts = await SenderHistoryRepository(db).known_correspondents(owner_id)
        assert ("friend@example.test", 1) in contacts

    async def test_mail_from_today_is_untouched(self, db):
        owner = await _user(db)
        today = await _email(db, owner, NOW)

        assert await discard_delivered_before(db, NOW - timedelta(minutes=1)) == 0

        row = await _reload(db, today)
        assert row.body_text == "See you at noon"
        assert await _scan_count(db, today) == 1

    @pytest.mark.parametrize(
        "status", [EmailStatus.QUARANTINED, EmailStatus.BLOCKED, EmailStatus.PENDING]
    )
    async def test_only_delivered_mail_is_erased(self, db, status):
        """Condemned mail is evidence; pending mail has not been judged yet."""
        owner = await _user(db)
        kept = await _email(db, owner, LAST_WEEK, status=status)

        assert await discard_delivered_before(db, NOW) == 0

        row = await _reload(db, kept)
        assert row.body_text == "See you at noon"
        assert await _scan_count(db, kept) == 1

    async def test_running_again_does_nothing(self, db):
        owner = await _user(db)
        await _email(db, owner, YESTERDAY)

        assert await discard_delivered_before(db, NOW) == 1
        assert await discard_delivered_before(db, NOW) == 0

    async def test_more_than_one_batch_is_erased(self, db, monkeypatch):
        from app.services import retention_service

        monkeypatch.setattr(retention_service, "BATCH", 2)
        owner = await _user(db)
        for _ in range(5):
            await _email(db, owner, YESTERDAY)

        assert await discard_delivered_before(db, NOW) == 5

    async def test_the_default_cutoff_is_the_start_of_the_database_day(self, db):
        owner = await _user(db)
        await _email(db, owner, LAST_WEEK)
        today = await _email(db, owner, NOW)

        assert await discard_delivered_before(db) == 1
        assert (await _reload(db, today)).discarded_at is None

    async def test_erased_mail_leaves_the_list(self, db):
        owner = await _user(db)
        old = await _email(db, owner, YESTERDAY)
        today = await _email(db, owner, NOW)

        await discard_delivered_before(db, NOW - timedelta(minutes=1))

        emails, total = await EmailRepository(db).list_emails(owner.id)
        assert [e.id for e in emails] == [today.id]
        assert total == 1
        assert old.id not in {e.id for e in emails}


@pytest.mark.asyncio
class TestErasedMailIsNotRescanned:
    async def test_payload_remediation_skips_and_counts_it(self, db, monkeypatch):
        owner = await _user(db)
        owner_id = owner.id
        old = await _email(db, owner, YESTERDAY)
        await discard_delivered_before(db, NOW)
        erased = await _reload(db, old)

        class _Scanner:
            def __init__(self):
                self.scanned = []

            async def scan_email(self, db, email, remediate=False):
                self.scanned.append(email.id)

        class _Repo:
            def __init__(self, db):
                pass

            async def delivered_siblings(self, fingerprints, user_id, exclude_email_id=None):
                return [erased]

        from app.services import remediation_service

        monkeypatch.setattr(remediation_service, "PayloadSightingRepository", _Repo)
        scanner = _Scanner()

        outcome = await RemediationService(scanner).remediate_payload(db, owner_id, ["fp"])

        assert scanner.scanned == []
        assert outcome.discarded == 1
        assert outcome.rescanned == 0


@pytest.mark.asyncio
class TestErasedMailEndpoints:
    async def test_detail_and_rescan_answer_gone(self, db, monkeypatch):
        from app.api.deps import get_current_user, get_scan_service
        from app.database.database import get_db
        from app.main import app

        owner = await _user(db)
        old = await _email(db, owner, YESTERDAY)
        await discard_delivered_before(db, NOW)

        async def _db():
            yield db

        app.dependency_overrides[get_db] = _db
        app.dependency_overrides[get_current_user] = lambda: owner
        app.dependency_overrides[get_scan_service] = lambda: object()
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as client:
                detail = await client.get(f"/api/v1/emails/{old.id}")
                rescan = await client.post(f"/api/v1/scan/email/{old.id}")
        finally:
            app.dependency_overrides.clear()

        assert detail.status_code == 410
        assert rescan.status_code == 410


@pytest.mark.asyncio
class TestRetentionSchedule:
    async def test_it_can_be_switched_off(self, monkeypatch):
        from app.core import scheduler
        from app.core.config import Settings

        monkeypatch.setattr(scheduler, "get_settings", lambda: Settings(DISCARD_DELIVERED_DAILY=False))
        monkeypatch.setattr(scheduler, "_last_retention_check", None)

        async def must_not_run(db):
            raise AssertionError("retention ran while switched off")

        monkeypatch.setattr(scheduler, "discard_delivered_before", must_not_run)
        assert await scheduler.retention_job() == 0

    async def test_it_checks_at_most_every_ten_minutes(self, monkeypatch):
        from app.core import scheduler
        from app.core.config import Settings

        monkeypatch.setattr(scheduler, "get_settings", lambda: Settings(DISCARD_DELIVERED_DAILY=True))
        monkeypatch.setattr(scheduler, "_last_retention_check", None)

        class _Session:
            async def __aenter__(self):
                return None

            async def __aexit__(self, *exc):
                return False

        runs = []

        async def discard(db):
            runs.append(1)
            return 0

        monkeypatch.setattr(scheduler, "AsyncSessionLocal", _Session)
        monkeypatch.setattr(scheduler, "discard_delivered_before", discard)

        await scheduler.retention_job()
        await scheduler.retention_job()

        assert runs == [1]
