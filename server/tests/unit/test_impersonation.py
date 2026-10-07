"""
Relationship signals, and the restraint they need.

SPF, DKIM and DMARC are what business email compromise passes — a correctly
signed message from a domain the attacker controls, asking for a payment in a
colleague's name. The checks here read the relationship instead.

The restraint is the harder half. Most legitimate mail is a first contact, so a
detector that treats an unfamiliar sender as suspicious fires on receipts,
newsletters and every new supplier. Half of these tests exist to pin that first
contact scores nothing on its own.
"""

import uuid

import pytest

from app.services.ai_analysis import AIAnalysisResult
from app.services.attachment_analysis import AttachmentAnalysisResult
from app.services.header_analysis import HeaderAnalysisResult
from app.services.impersonation_analysis import (
    ImpersonationAnalysisResult,
    ImpersonationAnalysisService,
    split_sender,
)
from app.services.risk_engine import RiskEngine
from app.services.url_analysis import URLAnalysisResult


class _History:
    """Stands in for the sender history repository."""

    def __init__(self, correspondents, raises=False):
        self.correspondents = correspondents
        self.raises = raises

    async def known_correspondents(self, user_id, limit=500):
        if self.raises:
            raise RuntimeError("database unavailable")
        return list(self.correspondents)


def _service(correspondents, raises=False):
    history = _History(correspondents, raises)
    return ImpersonationAnalysisService(repository_factory=lambda db: history)


async def _analyze(sender, correspondents, raises=False):
    return await _service(correspondents, raises).analyze(None, uuid.uuid4(), sender)


class TestSenderSplitting:
    def test_separates_name_from_address(self):
        assert split_sender('"Jane Doe" <jane@acme.net>') == ("jane doe", "jane@acme.net")

    def test_handles_a_bare_address(self):
        assert split_sender("jane@acme.net") == ("", "jane@acme.net")

    def test_handles_nonsense(self):
        assert split_sender("") == ("", "")


@pytest.mark.asyncio
class TestFirstContactIsNotEvidence:
    async def test_an_unknown_sender_scores_nothing(self):
        """
        The whole detector is worthless if this fails: a new supplier, a
        receipt and a recruiter are all first contacts.
        """
        result = await _analyze("new@supplier.net", [("known@acme.net", 10)])

        assert result.first_contact is True
        assert result.score == 0.0

    async def test_first_contact_is_still_reported(self):
        """Not scored is not the same as not recorded — an analyst wants to see it."""
        result = await _analyze("new@supplier.net", [("known@acme.net", 10)])

        assert result.findings

    async def test_a_known_sender_is_not_first_contact(self):
        result = await _analyze("known@acme.net", [("known@acme.net", 10)])

        assert result.first_contact is False
        assert result.score == 0.0


# One established correspondent: Jane, at acme.net, seen often enough to be a
# relationship rather than a single sighting.
JANE = [('"Jane Doe" <jane@acme.net>', 9)]


@pytest.mark.asyncio
class TestDisplayNameImpersonation:
    async def test_a_known_name_from_an_unknown_address_is_scored(self):
        result = await _analyze('"Jane Doe" <jane.doe@gmail.example>', JANE)

        assert result.display_name_impersonation is True
        assert result.impersonated == "jane@acme.net"
        assert result.score > 0

    async def test_the_same_name_at_the_known_address_is_not(self):
        result = await _analyze('"Jane Doe" <jane@acme.net>', JANE)

        assert result.display_name_impersonation is False
        assert result.score == 0.0

    async def test_an_unfamiliar_name_is_not_impersonation(self):
        result = await _analyze('"Bob Smith" <bob@elsewhere.net>', JANE)

        assert result.display_name_impersonation is False
        assert result.score == 0.0

    async def test_a_name_seen_once_is_not_a_relationship(self):
        """
        One prior message from a display name is as likely to be the attacker's
        own earlier attempt as a real correspondent.
        """
        result = await _analyze(
            '"Jane Doe" <jane.doe@gmail.example>', [('"Jane Doe" <jane@acme.net>', 1)]
        )

        assert result.display_name_impersonation is False


@pytest.mark.asyncio
class TestLookalikeAddresses:
    async def test_a_near_miss_address_is_scored(self):
        result = await _analyze("biling@acme.net", [("billing@acme.net", 12)])

        assert result.lookalike_address is True
        assert result.score > 0

    async def test_a_genuinely_different_address_is_not(self):
        result = await _analyze("recruiting@totally-other.example", [("billing@acme.net", 12)])

        assert result.lookalike_address is False
        assert result.score == 0.0

    async def test_short_addresses_are_not_compared(self):
        """Two edits on a short address is a different person, not a near-miss."""
        result = await _analyze("ab@x.co", [("cd@x.co", 12)])

        assert result.lookalike_address is False


@pytest.mark.asyncio
class TestDegradation:
    async def test_a_history_failure_is_not_silence(self):
        """
        A lookup that failed must not read as "checked, found nothing".
        """
        result = await _analyze("anyone@example.net", [], raises=True)

        assert result.ran is False
        assert result.skipped_reason
        assert result.score == 0.0

    async def test_an_unparseable_sender_is_skipped(self):
        result = await _analyze("not an address", [("known@acme.net", 3)])

        assert result.ran is False
        assert result.skipped_reason


# ----------------------------------------------------------------------
# What the risk engine does with it
# ----------------------------------------------------------------------


def _score(impersonation, *, solicits=False, reply_to_mismatch=False):
    engine = RiskEngine()
    return engine.calculate(
        HeaderAnalysisResult(score=0.0, reply_to_mismatch=reply_to_mismatch),
        URLAnalysisResult(score=0.0),
        AttachmentAnalysisResult(score=0.0),
        AIAnalysisResult(
            score=10.0,
            requests_credentials=solicits,
            requests_financials=False,
            source="llm",
        ),
        impersonation=impersonation,
    )


class TestRiskEngineUsesTheSignals:
    def test_first_contact_alone_moves_nothing(self):
        baseline = _score(ImpersonationAnalysisResult())
        first = _score(ImpersonationAnalysisResult(ran=True, first_contact=True))

        assert first.final_score == baseline.final_score

    def test_first_contact_plus_a_solicitation_does(self):
        """
        Neither half is evidence alone. A request worth inventing a sender for,
        from a sender never seen before, is the shape authentication cannot see.
        """
        without = _score(
            ImpersonationAnalysisResult(ran=True, first_contact=True), solicits=False
        )
        with_ask = _score(
            ImpersonationAnalysisResult(ran=True, first_contact=True), solicits=True
        )

        assert with_ask.final_score > without.final_score

    def test_a_known_sender_asking_for_credentials_is_not_escalated_by_this_rule(self):
        """The rule is about strangers; an established correspondent is not one."""
        stranger = _score(
            ImpersonationAnalysisResult(ran=True, first_contact=True), solicits=True
        )
        known = _score(
            ImpersonationAnalysisResult(ran=True, first_contact=False), solicits=True
        )

        assert stranger.final_score > known.final_score

    def test_impersonation_with_a_reply_to_mismatch_reaches_quarantine(self):
        """The classic triad: known name, unknown address, replies elsewhere."""
        result = _score(
            ImpersonationAnalysisResult(
                ran=True,
                first_contact=True,
                display_name_impersonation=True,
                score=55.0,
            ),
            reply_to_mismatch=True,
            solicits=True,
        )

        assert result.final_score >= RiskEngine.QUARANTINE_THRESHOLD

    def test_an_analyser_that_found_nothing_does_not_lower_the_score(self):
        """
        The engine's founding property: silence is the absence of evidence.
        """
        without = _score(None)
        with_silent = _score(ImpersonationAnalysisResult(ran=True, score=0.0))

        assert with_silent.final_score == without.final_score
