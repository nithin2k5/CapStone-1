import pytest

from app.services.ai_analysis import AIAnalysisResult
from app.services.fragment_isolation import FragmentIsolationService
from app.services.verdict_stability import StabilityResult, VerdictStabilityService
from app.utils.email_parser import parse_email_content


class Model:
    def __init__(self, required=("TRIGGER",)):
        self.required = required
        self.fail = False
        self.drift = False

    async def analyze_body(self, parsed, body, disclose_concealment):
        assert not disclose_concealment
        if self.fail:
            raise RuntimeError("unavailable")
        return AIAnalysisResult(source="llm", score=5 if self.drift or all(t in body for t in self.required) else 70)


async def seed(ai, hidden):
    parsed = parse_email_content({}, body_html=f'<p>Visible request</p><span hidden>{hidden}</span>')
    stability = await VerdictStabilityService(ai, True).analyze(parsed, AIAnalysisResult(source="llm"))
    return parsed, stability


@pytest.mark.asyncio
async def test_isolates_reproducible_fragment_and_records_source_ranges():
    ai = Model()
    parsed, stability = await seed(ai, "benign footer TRIGGER harmless tracking information")
    result = await FragmentIsolationService(ai, True).analyze(parsed, stability)
    assert result.ran and result.reproduced
    assert result.fragment == "TRIGGER"
    assert result.calls <= 16
    assert "".join(parsed.rendered.hidden_text[a:b] for a, b in result.source_ranges).strip() == result.fragment


@pytest.mark.asyncio
async def test_preserves_interacting_fragments():
    ai = Model(("ALPHA", "OMEGA"))
    parsed, stability = await seed(ai, "ALPHA benign footer OMEGA normal tracking")
    result = await FragmentIsolationService(ai, True).analyze(parsed, stability)
    assert result.reproduced
    assert "ALPHA" in result.fragment and "OMEGA" in result.fragment
    assert result.calls <= 16


@pytest.mark.asyncio
async def test_fresh_controls_reject_model_drift():
    ai = Model()
    parsed, stability = await seed(ai, "benign TRIGGER footer text")
    ai.drift = True
    result = await FragmentIsolationService(ai, True).analyze(parsed, stability)
    assert result.ran and not result.reproduced


@pytest.mark.asyncio
async def test_failure_and_missing_seed_are_explicit():
    ai = Model()
    parsed, stability = await seed(ai, "benign TRIGGER footer text")
    skipped = await FragmentIsolationService(ai, True).analyze(parsed, StabilityResult())
    assert skipped.skipped_reason and skipped.calls == 0
    ai.fail = True
    failed = await FragmentIsolationService(ai, True).analyze(parsed, stability)
    assert failed.degraded and not failed.reproduced
