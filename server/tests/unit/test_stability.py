import pytest

from app.services.ai_analysis import AIAnalysisResult
from app.services.attachment_analysis import AttachmentAnalysisResult
from app.services.header_analysis import HeaderAnalysisResult
from app.services.risk_engine import RiskEngine
from app.services.url_analysis import URLAnalysisResult
from app.services.verdict_stability import StabilityResult, VerdictStabilityService
from app.utils.email_parser import parse_email_content


def message(hidden="ordinary concealed preview text"):
    return parse_email_content({}, body_html=f'<p>Visible request</p><div hidden>{hidden}</div>')


class Model:
    def __init__(self, noisy=False, fail=False):
        self.bodies = []
        self.noisy = noisy
        self.fail = fail

    async def analyze_body(self, parsed, body, disclose_concealment):
        assert disclose_concealment is False
        self.bodies.append(body)
        if self.fail:
            raise ValueError("offline")
        score = (10 if len(self.bodies) % 2 else 90) if self.noisy else (5 if "TRIGGER" in body else 70)
        return AIAnalysisResult(score=score, source="llm")


@pytest.mark.asyncio
async def test_repeated_suppression_with_unchanged_visible_text():
    ai = Model()
    parsed = message("TRIGGER hidden manipulation payload")
    result = await VerdictStabilityService(ai, True).analyze(parsed, AIAnalysisResult(source="llm"))
    assert result.ran and result.review_required
    assert result.control_scores == [70, 70, 70]
    assert all(v["direction"] == "suppression" for v in result.variants)
    assert result.calls <= 9
    assert parsed.rendered.visible_text == "Visible request"


@pytest.mark.asyncio
async def test_benign_concealment_is_not_flagged():
    result = await VerdictStabilityService(Model(), True).analyze(message(), AIAnalysisResult(source="llm"))
    assert result.ran and not result.review_required


@pytest.mark.asyncio
async def test_model_noise_is_inconclusive_not_attributed_to_a_payload():
    result = await VerdictStabilityService(Model(noisy=True), True).analyze(message(), AIAnalysisResult(source="llm"))
    assert result.inconclusive and result.review_required
    assert not result.variants and result.calls == 3


@pytest.mark.asyncio
async def test_failure_is_not_a_clean_result():
    result = await VerdictStabilityService(Model(fail=True), True).analyze(message(), AIAnalysisResult(source="llm"))
    assert result.degraded and not result.ran


@pytest.mark.asyncio
@pytest.mark.parametrize("parsed,visible,enabled", [
    (message(), AIAnalysisResult(), True),
    (message(), AIAnalysisResult(source="llm"), False),
    (message("x" * 6001), AIAnalysisResult(source="llm"), True),
    (parse_email_content({}, "Plain email"), AIAnalysisResult(source="llm"), True),
])
async def test_skips_without_spending_calls(parsed, visible, enabled):
    result = await VerdictStabilityService(Model(), enabled).analyze(parsed, visible)
    assert result.skipped_reason and result.calls == 0


def test_unreliable_verdict_routes_to_quarantine_without_lowering_other_risk():
    engine = RiskEngine()
    args = (HeaderAnalysisResult(), URLAnalysisResult(), AttachmentAnalysisResult(), AIAnalysisResult())
    result = engine.calculate(*args, stability=StabilityResult(ran=True, review_required=True))
    assert result.final_score == engine.QUARANTINE_THRESHOLD
    assert result.findings["stability"]["review_required"]
