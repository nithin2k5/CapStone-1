from dataclasses import dataclass, field

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.ai_analysis import AIAnalysisResult, AIAnalysisService
from app.utils.email_parser import ParsedEmail

logger = get_logger("differential_probe")


@dataclass
class DifferentialProbeResult:
    ran: bool = False
    degraded: bool = False
    # The two verdicts being compared, on the same 0-100 scale as the AI score.
    visible_score: float = 0.0
    ingested_score: float = 0.0
    # How far the concealed half moved the verdict, split by direction. Only one
    # of these is ever non-zero.
    suppression: float = 0.0
    escalation: float = 0.0
    injection_reported: bool = False
    skipped_reason: str = ""
    findings: list[str] = field(default_factory=list)


class DifferentialProbeService:
    """
    Measure what the concealed half of a message does to the verdict.

    The perceptual analyser asks whether hidden text *looks* like an instruction,
    which means a pattern list decides what counts. This asks whether it *works*:
    the same model, prompt and headers score the message twice, once over the text
    the recipient renders and once over the text an ordinary classifier ingests.
    The body is the only variable, so the difference between the two verdicts is
    the measured effect of the concealed text — a payload in wording no pattern
    anticipates still moves the number.

    A drop toward "safe" is the suppression signature: nothing a sender conceals
    from the reader has a benign reason to argue the classifier down.

    The probe deliberately feeds attacker-controlled text to the model, so its
    verdict is never allowed to lower a score. It is evidence in one direction
    only, and the risk engine treats it that way.
    """

    # Below this, the concealed text is a preheader or a tracking pixel's alt
    # text, and a second round trip per message buys nothing.
    MIN_HIDDEN_CHARS = 16

    # Verdicts wobble by a few points between identical calls at temperature 0.1.
    # Only a move larger than that noise floor is reported as an effect.
    SUPPRESSION_THRESHOLD = 15.0
    ESCALATION_THRESHOLD = 15.0

    def __init__(
        self,
        ai_service: AIAnalysisService | None = None,
        enabled: bool | None = None,
    ) -> None:
        self.ai_service = ai_service or AIAnalysisService()
        self.enabled = (
            get_settings().differential_probe_enabled if enabled is None else enabled
        )

    def _skip(self, reason: str) -> DifferentialProbeResult:
        return DifferentialProbeResult(skipped_reason=reason)

    def _ingested_text(self, parsed: ParsedEmail) -> str:
        """
        The body as a classifier that flattens HTML reads it.

        `machine_text` is that flattening. Where the parser could not produce one,
        concatenating the two channels reconstructs the same document.
        """
        rendered = parsed.rendered
        if rendered is None:
            return ""
        if rendered.machine_text:
            return rendered.machine_text
        return f"{rendered.visible_text}\n{rendered.hidden_text}".strip()

    async def probe(
        self, parsed: ParsedEmail, visible: AIAnalysisResult
    ) -> DifferentialProbeResult:
        """Score the ingested body and report how far it moved the verdict."""
        if not self.enabled:
            return self._skip("Differential probe disabled")

        rendered = parsed.rendered
        if rendered is None or len(rendered.hidden_text.strip()) < self.MIN_HIDDEN_CHARS:
            return self._skip("No concealed text to probe")

        # Without a model verdict on the visible text there is nothing to compare
        # against: a heuristic score and an LLM score are not the same measurement.
        if visible.degraded or visible.source != "llm":
            return self._skip("No model verdict on the visible text to compare against")

        ingested = self._ingested_text(parsed)
        if not ingested.strip():
            return self._skip("No ingested body to probe")

        try:
            probed = await self.ai_service.analyze_body(
                parsed, ingested, disclose_concealment=False
            )
        except Exception as e:
            logger.error(
                "Differential probe failed (%s: %s); the concealed half of this "
                "message was not measured.",
                type(e).__name__,
                e,
                exc_info=True,
            )
            return DifferentialProbeResult(
                degraded=True,
                visible_score=visible.score,
                findings=["Differential probe unavailable: second analysis failed"],
            )

        delta = visible.score - probed.score
        suppression = max(delta, 0.0)
        escalation = max(-delta, 0.0)
        findings: list[str] = []

        if suppression >= self.SUPPRESSION_THRESHOLD:
            findings.append(
                f"Concealed text moved the analyser's verdict {suppression:.0f} "
                f"points toward safe ({visible.score:.0f} visible, "
                f"{probed.score:.0f} as ingested)"
            )
        elif escalation >= self.ESCALATION_THRESHOLD:
            findings.append(
                f"Concealed text carries {escalation:.0f} points of content the "
                "recipient never sees"
            )
        else:
            findings.append(
                "Concealed text did not move the analyser's verdict"
            )

        if probed.injection_attempt and not visible.injection_attempt:
            findings.append(
                "The analyser reported the concealed text tried to instruct it"
            )

        return DifferentialProbeResult(
            ran=True,
            visible_score=round(visible.score, 2),
            ingested_score=round(probed.score, 2),
            suppression=round(suppression, 2),
            escalation=round(escalation, 2),
            injection_reported=probed.injection_attempt,
            findings=findings,
        )
