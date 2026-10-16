from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database.models import Base, Email, EmailStatus, SenderTrustDependency, User
from app.repositories.sender_repository import SenderHistoryRepository
from app.repositories.trust_repository import TrustRepository
from app.services.ai_analysis import AIAnalysisResult
from app.services.header_analysis import HeaderAnalysisResult
from app.services.impersonation_analysis import ImpersonationAnalysisService
from app.services.scan_service import ScanService
from app.services.trust_reassessment import TrustReassessmentService


@pytest.fixture
async def db(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path}/trust.sqlite3")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        yield session
    await engine.dispose()


async def user(db):
    row = User(id=uuid4(), name="Test", email=f"{uuid4()}@example.test", hashed_password="unused")
    db.add(row)
    await db.flush()
    return row


async def email(db, owner, day, body="Hello", status=EmailStatus.SAFE):
    row = Email(id=uuid4(), user_id=owner.id, gmail_message_id=str(uuid4()),
                sender="supplier@example.test", recipient=owner.email,
                body_text=body, body_html="", status=status, risk_score=0,
                created_at=datetime(2025, 1, 1, tzinfo=timezone.utc) + timedelta(days=day))
    row.scan_result = None
    db.add(row)
    await db.flush()
    return row


class Model:
    async def analyze_with_llm(self, parsed):
        solicits = "credentials" in parsed.body_text
        return AIAnalysisResult(score=95 if "condemned" in parsed.body_text else 30 if solicits else 0,
                                requests_credentials=solicits, source="heuristic")


class Headers:
    def analyze(self, parsed, dkim):
        return HeaderAnalysisResult()


class Quarantine:
    async def apply_quarantine(self, db, email, score):
        email.status = EmailStatus.BLOCKED if score >= 80 else EmailStatus.QUARANTINED if score >= 60 else EmailStatus.SAFE
        email.enforced = True
        email.risk_score = score
        await db.flush()


def scanner():
    return ScanService(ai_service=Model(), header_service=Headers(), quarantine_service=Quarantine())


async def test_condemned_history_rechecks_direct_and_transitive_dependents(db):
    owner = await user(db)
    a = await email(db, owner, 0)
    b = await email(db, owner, 1, "Send credentials")
    c = await email(db, owner, 2, "Send credentials")
    service = scanner()
    await service.scan_email(db, a)
    await service.scan_email(db, b)
    await service.scan_email(db, c)
    assert b.status == c.status == EmailStatus.SAFE
    assert b.scan_result.findings["sender_trust"]["supporting_email_ids"] == [str(a.id)]

    a.body_text = "condemned credentials"
    result = await service.scan_email(db, a)
    assert b.status == c.status == EmailStatus.QUARANTINED
    assert result.findings["trust_invalidation"]["rescanned"] == 2
    assert result.findings["trust_invalidation"]["pulled"] == 2
    assert b.remediated_at and c.remediated_at
    assert b.scan_result.findings["trust_reassessment"]["triggering_email_id"] == str(a.id)
    assert b.scan_result.findings["sender_trust"]["supporting_email_ids"] == []


async def test_history_cannot_use_self_future_other_tenants_or_stale_evidence(db):
    owner, other = await user(db), await user(db)
    root = await email(db, owner, 0)
    prior = await email(db, owner, 1)
    current = await email(db, owner, 2)
    await email(db, owner, 3)
    await email(db, other, 0)
    await TrustRepository(db).record(prior, [str(root.id)])
    root.status = EmailStatus.QUARANTINED
    await db.flush()
    await TrustRepository(db).invalidate_descendants(owner.id, root.id)
    rows, truncated = await SenderHistoryRepository(db).evidence_before(current)
    assert rows == [] and not truncated
    result = await ImpersonationAnalysisService().analyze(db, owner.id, current.sender, email=current)
    assert result.first_contact


async def test_rescan_replaces_edges_and_rejects_cross_tenant_support(db):
    owner, other = await user(db), await user(db)
    a, b = await email(db, owner, 0), await email(db, owner, 1)
    foreign = await email(db, other, 0)
    repo = TrustRepository(db)
    await repo.record(b, [str(a.id), str(b.id), str(foreign.id)])
    await repo.record(b, [str(a.id)])
    edges = list((await db.execute(select(SenderTrustDependency))).scalars().all())
    assert len(edges) == 1 and edges[0].supporting_email_id == a.id
    await repo.record(b, [])
    assert not list((await db.execute(select(SenderTrustDependency))).scalars().all())


async def test_bounded_graph_walk_reports_overflow_and_does_not_cross_tenants(db):
    owner, other = await user(db), await user(db)
    root = await email(db, owner, 0)
    descendants = [await email(db, owner, i + 1) for i in range(3)]
    foreign = await email(db, other, 1)
    repo = TrustRepository(db)
    for row in descendants:
        await repo.record(row, [str(root.id)])
    await repo.record(foreign, [str(root.id)])
    selected, truncated = await repo.invalidate_descendants(owner.id, root.id, limit=2)
    assert len(selected) == 2 and truncated
    assert all(row.user_id == owner.id for row in selected)
    stale = list((await db.execute(select(SenderTrustDependency).where(SenderTrustDependency.invalidated.is_(True)))).scalars().all())
    assert len(stale) == 3


async def test_independently_safe_dependent_stays_safe(db):
    owner = await user(db)
    a, b = await email(db, owner, 0), await email(db, owner, 1)
    service = scanner()
    await service.scan_email(db, a)
    await service.scan_email(db, b)
    a.body_text = "condemned credentials"
    await service.scan_email(db, a)
    assert b.status == EmailStatus.SAFE
    assert b.remediated_at is None
    assert b.scan_result.findings["trust_reassessment"]["new_score"] == 0


async def test_failed_rescan_keeps_stale_edges_and_other_rescans_continue(db):
    owner = await user(db)
    root = await email(db, owner, 0)
    first, second = await email(db, owner, 1), await email(db, owner, 2)
    for row in (first, second):
        await TrustRepository(db).record(row, [str(root.id)])
    first_id, second_id = first.id, second.id
    real = scanner()

    class FlakyScanner:
        async def scan_email(self, db, email, **kwargs):
            assert kwargs == {"remediate": False, "reassess_trust": False}
            if email.id == first_id:
                email.subject = "This write must roll back"
                await db.flush()
                raise RuntimeError("failed")
            return await real.scan_email(db, email, **kwargs)

    outcome = await TrustReassessmentService(FlakyScanner()).reassess(db, root)
    assert outcome["failed"] == 1 and outcome["rescanned"] == 1
    await db.refresh(first)
    assert first.subject != "This write must roll back"
    stale = list((await db.execute(select(SenderTrustDependency).where(
        SenderTrustDependency.email_id == first_id, SenderTrustDependency.invalidated.is_(True),
    ))).scalars().all())
    assert stale
    assert second.id == second_id and second.scan_result.findings["trust_reassessment"]


async def test_campaign_style_rescan_also_invalidates_trust(db):
    owner = await user(db)
    a, b = await email(db, owner, 0), await email(db, owner, 1, "Send credentials")
    service = scanner()
    await service.scan_email(db, a)
    await service.scan_email(db, b)
    a.body_text = "condemned credentials"
    await service.scan_email(db, a, remediate=False)
    assert b.status == EmailStatus.QUARANTINED


async def test_revised_verdict_distinguishes_failed_mailbox_enforcement(db):
    owner = await user(db)
    a, b = await email(db, owner, 0), await email(db, owner, 1, "Send credentials")
    service = scanner()
    await service.scan_email(db, a)
    await service.scan_email(db, b)

    class RefusingMailbox(Quarantine):
        async def apply_quarantine(self, db, email, score):
            await super().apply_quarantine(db, email, score)
            email.enforced = False

    service.quarantine_service = RefusingMailbox()
    a.body_text = "condemned credentials"
    result = await service.scan_email(db, a)
    assert result.findings["trust_invalidation"]["unenforced"] == 1
    assert result.findings["trust_invalidation"]["pulled"] == 0
