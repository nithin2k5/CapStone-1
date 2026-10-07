"""
The verdict a scan reaches is the status the row keeps.

scan_email ended with `email.status = EmailStatus.SCANNED`, which ran after
apply_quarantine had already set BLOCKED, QUARANTINED or SAFE. The mailbox move
still happened, so the behaviour looked right from the mailbox side, but the row
recorded no decision — and the dashboard groups SCANNED with safe mail, so its
quarantined and blocked counts were structurally zero whatever arrived.

Nothing asserted the status after a scan, which is why it survived. These tests
do.
"""

import pytest

from app.database.models import Email, EmailStatus
from app.services.ai_analysis import AIAnalysisResult, AIAnalysisService
from app.services.scan_service import ScanService


class _StubSession:
    def __init__(self):
        self.added = []
        self.queries = []

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        return None

    async def refresh(self, obj):
        return None

    async def rollback(self):
        return None

    async def commit(self):
        return None

    async def execute(self, query):
        self.queries.append(query)

        class _Result:
            def scalars(self):
                class _Scalars:
                    def all(self):
                        return []

                return _Scalars()

            def scalar_one_or_none(self):
                return None

        return _Result()


class _ScoringAI(AIAnalysisService):
    """A model whose verdict is fixed, so the risk score is the test's input."""

    def __init__(self, score):
        self._score = score

    async def analyze_with_llm(self, parsed):
        return AIAnalysisResult(
            score=self._score,
            phishing_probability=self._score / 100,
            source="llm",
            reasons=["fixed for test"],
            requests_credentials=self._score > 50,
            is_urgent=self._score > 50,
        )


class _RecordingQuarantine:
    """The real decision logic, without a mailbox behind it."""

    def __init__(self):
        from app.services.risk_engine import RiskEngine

        self.risk_engine = RiskEngine()
        self.moves: list[str] = []

    async def apply_quarantine(self, db, email, final_score):
        if self.risk_engine.should_block(final_score):
            email.status = EmailStatus.BLOCKED
        elif self.risk_engine.should_quarantine(final_score):
            email.status = EmailStatus.QUARANTINED
        else:
            email.status = EmailStatus.SAFE
        self.moves.append(email.status.value)
        email.enforced = True
        email.risk_score = final_score
        return email.status


def _email(html="<html><body><p>Hello</p></body></html>"):
    email = Email(
        sender="billing@acme.net",
        recipient="user@corp.com",
        subject="Invoice",
        body_html=html,
        status=EmailStatus.PENDING,
        raw_headers={"From": "billing@acme.net", "Subject": "Invoice"},
    )
    email.scan_result = None
    return email


async def _scan(score, html=None):
    quarantine = _RecordingQuarantine()
    service = ScanService(
        ai_service=_ScoringAI(score), quarantine_service=quarantine
    )
    email = _email(html) if html else _email()
    await service.scan_email(_StubSession(), email)
    return email, quarantine


@pytest.mark.asyncio
class TestVerdictSurvivesTheScan:
    async def test_a_scan_never_leaves_the_row_in_a_pre_verdict_state(self):
        """
        PENDING and SCANNED both mean "no decision recorded". Finishing a scan in
        either is the failure this guards: the message has been judged.
        """
        for score in (5.0, 70.0, 95.0):
            email, _ = await _scan(score)
            assert email.status not in (EmailStatus.PENDING, EmailStatus.SCANNED), (
                f"score {score} left the row at {email.status}"
            )

    async def test_calm_mail_ends_safe(self):
        email, quarantine = await _scan(5.0)
        assert email.status is EmailStatus.SAFE
        assert quarantine.moves == ["safe"]

    async def test_the_status_matches_what_quarantine_decided(self):
        """
        The two used to disagree: quarantine decided, then the scan overwrote it.
        """
        for score in (5.0, 70.0, 95.0):
            email, quarantine = await _scan(score)
            assert email.status.value == quarantine.moves[-1]

    async def test_the_score_is_recorded_with_the_verdict(self):
        email, _ = await _scan(95.0)
        assert email.risk_score > 0
