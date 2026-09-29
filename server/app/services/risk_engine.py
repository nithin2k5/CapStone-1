from dataclasses import dataclass, field

from app.database.models import RiskLevel
from app.services.ai_analysis import AIAnalysisResult
from app.services.attachment_analysis import AttachmentAnalysisResult
from app.services.differential_probe import DifferentialProbeResult
from app.services.header_analysis import HeaderAnalysisResult
from app.services.perceptual_analysis import PerceptualAnalysisResult
from app.services.url_analysis import URLAnalysisResult
from app.utils.helpers import score_to_risk_level


@dataclass
class RiskEngineResult:
    header_score: float
    url_score: float
    attachment_score: float
    ai_score: float
    final_score: float
    risk_level: RiskLevel
    explanation: str
    perceptual_score: float = 0.0
    # How far the concealed half moved the content verdict, toward safe. Reported
    # separately from the scores because it is a measurement of an attack's
    # effect, not an analyser's opinion.
    suppression: float = 0.0
    findings: dict = field(default_factory=dict)


class RiskEngine:
    """
    Aggregate analysis scores into a final risk assessment.

    The weights and multipliers below are hand-chosen, not fitted. They compose,
    so a message hitting several combinations saturates the cap before the
    evidence is exhausted — calibrating this layer is separate outstanding work.
    """

    WEIGHTS = {
        "header": 0.25,
        "url": 0.20,
        "attachment": 0.20,
        "ai": 0.20,
        "perceptual": 0.15,
    }

    QUARANTINE_THRESHOLD = 60.0
    BLOCK_THRESHOLD = 80.0

    # A measured drop toward "safe" caused by text the recipient cannot see. The
    # probe already applies its own noise floor; this is the point at which the
    # move is treated as an attack rather than reported as a number.
    SUPPRESSION_THRESHOLD = 15.0

    def calculate(
        self,
        header: HeaderAnalysisResult,
        url: URLAnalysisResult,
        attachment: AttachmentAnalysisResult,
        ai: AIAnalysisResult,
        perceptual: PerceptualAnalysisResult | None = None,
        probe: DifferentialProbeResult | None = None,
    ) -> RiskEngineResult:
        perceptual = perceptual or PerceptualAnalysisResult()
        probe = probe or DifferentialProbeResult()

        # The probe scored a body containing attacker-controlled text, so its
        # verdict may only raise the content component, never lower it. Where the
        # concealed half is itself malicious, that content counts; where it argued
        # the verdict down, the lower number is discarded here and the drop is
        # scored as the attack it is, below.
        ai_content_score = ai.score
        if probe.ran and probe.escalation:
            ai_content_score = max(ai.score, probe.ingested_score)

        # Base additive score
        base_score = (
            header.score * self.WEIGHTS["header"]
            + url.score * self.WEIGHTS["url"]
            + attachment.score * self.WEIGHTS["attachment"]
            + ai_content_score * self.WEIGHTS["ai"]
            + perceptual.score * self.WEIGHTS["perceptual"]
        )

        multiplier = 1.0
        explanation_parts = []
        
        # Compounding Risk Combinations
        if ai.is_urgent and url.has_suspicious_domain:
            multiplier *= 1.5
            explanation_parts.append("Compounding Risk: Urgency language combined with suspicious link")
            
        if header.reply_to_mismatch and (ai.requests_financials or ai.requests_credentials):
            multiplier *= 2.0
            explanation_parts.append("Critical Risk: Reply-To mismatch combined with financial/credential request")
            
        if header.failed_dmarc and attachment.score > 50:
            multiplier *= 1.8
            explanation_parts.append("High Risk: Failed DMARC combined with suspicious attachment")
            
        if ai.requests_credentials and url.has_suspicious_domain:
            multiplier *= 1.5
            explanation_parts.append("High Risk: Credential request combined with suspicious link")

        # The injection signature: the message carries instructions the recipient
        # cannot see, and the content analyser came back calm. Either the payload
        # worked or it was neutralised, but the intent is established either way.
        if perceptual.imperative_hidden and ai.score < 40:
            multiplier *= 2.5
            explanation_parts.append(
                "Critical Risk: concealed instructions to the analyser alongside a low "
                "content score — the verdict may have been suppressed"
            )
        elif perceptual.imperative_hidden:
            multiplier *= 1.5
            explanation_parts.append(
                "High Risk: concealed text addresses the analyser rather than the reader"
            )

        # A measured effect, not a pattern match: the concealed text is the only
        # difference between the two passes, so the drop is what it bought.
        suppressed = probe.ran and probe.suppression >= self.SUPPRESSION_THRESHOLD
        if suppressed:
            multiplier *= 2.0
            explanation_parts.append(
                "Critical Risk: concealed text moved the analyser's verdict "
                f"{probe.suppression:.0f} points toward safe"
            )

        injection_reported = ai.injection_attempt or probe.injection_reported
        if injection_reported:
            multiplier *= 1.8
            explanation_parts.append(
                "Critical Risk: the analyser reported the message tried to instruct it"
            )

        if perceptual.link_mismatch and (
            ai.requests_credentials or ai.requests_financials
        ):
            multiplier *= 1.5
            explanation_parts.append(
                "High Risk: concealed link combined with a credential or financial request"
            )

        final_score = base_score * multiplier

        # A weighted average lets analysers that found nothing dilute one that found
        # something conclusive: a maxed perceptual score contributes only 15 points of
        # base, so an otherwise clean-looking message carrying concealed instructions
        # landed in "low" no matter how clear the evidence was. Evidence accumulates
        # rather than averaging, so these findings set a lower bound on the result.
        floor = 0.0
        floor_reasons: list[str] = []
        if perceptual.imperative_hidden:
            floor = max(floor, self.QUARANTINE_THRESHOLD)
            floor_reasons.append("concealed text instructing the analyser")
        if injection_reported:
            floor = max(floor, self.QUARANTINE_THRESHOLD)
            floor_reasons.append("an analyser-reported injection attempt")
        if suppressed:
            floor = max(floor, self.QUARANTINE_THRESHOLD)
            floor_reasons.append("a measured drop in the verdict caused by hidden text")

        if floor > final_score:
            explanation_parts.append(
                f"Score raised to the quarantine floor: {' and '.join(floor_reasons)} "
                "has no benign explanation, whatever the other analysers found"
            )
            final_score = floor

        final_score = round(min(final_score, 100.0), 2)

        risk_level_str = score_to_risk_level(final_score)
        risk_level = RiskLevel(risk_level_str)

        if header.findings:
            explanation_parts.append(f"Header: {len(header.findings)} issue(s)")
        if url.findings:
            explanation_parts.append(f"URLs: {len(url.flagged_urls)} flagged")
        if attachment.findings:
            explanation_parts.append(f"Attachments: {len(attachment.findings)} concern(s)")
        if ai.reasons:
            explanation_parts.append(f"AI: {ai.phishing_probability:.0f}% phishing probability")
        if ai.degraded:
            explanation_parts.append("AI module degraded (heuristic fallback)")
        if probe.degraded:
            explanation_parts.append("Differential probe unavailable")
        if perceptual.channels:
            explanation_parts.append(
                f"Concealment: {len(perceptual.channels)} channel(s), "
                f"{perceptual.hidden_ratio:.0%} of body hidden"
            )

        explanation = "; ".join(explanation_parts) or "No significant threats detected"

        return RiskEngineResult(
            header_score=round(header.score, 2),
            url_score=round(url.score, 2),
            attachment_score=round(attachment.score, 2),
            ai_score=round(ai.score, 2),
            perceptual_score=round(perceptual.score, 2),
            suppression=probe.suppression,
            final_score=final_score,
            risk_level=risk_level,
            explanation=explanation,
            findings={
                "header": header.findings,
                "urls": url.flagged_urls,
                "url_findings": url.findings,
                "attachments": attachment.findings,
                "attachment_hashes": attachment.hashes,
                "ai": {
                    "phishing_probability": ai.phishing_probability,
                    "spam_probability": ai.spam_probability,
                    "reasons": ai.reasons,
                    "source": ai.source,
                    "degraded": ai.degraded,
                    "injection_attempt": ai.injection_attempt,
                },
                "probe": {
                    "ran": probe.ran,
                    "degraded": probe.degraded,
                    "visible_score": probe.visible_score,
                    "ingested_score": probe.ingested_score,
                    "suppression": probe.suppression,
                    "escalation": probe.escalation,
                    "injection_reported": probe.injection_reported,
                    "skipped_reason": probe.skipped_reason,
                    "findings": probe.findings,
                },
                "perceptual": {
                    "findings": perceptual.findings,
                    "hidden_ratio": perceptual.hidden_ratio,
                    "hidden_chars": perceptual.hidden_chars,
                    "imperative_hidden": perceptual.imperative_hidden,
                    "instruction_patterns": perceptual.instruction_patterns,
                    "invisible_codepoints": perceptual.invisible_codepoints,
                    "mixed_script_words": perceptual.mixed_script_words,
                    "link_mismatch": perceptual.link_mismatch,
                    "channels": perceptual.channels,
                },
            },
        )

    def should_quarantine(self, final_score: float) -> bool:
        return final_score >= self.QUARANTINE_THRESHOLD

    def should_block(self, final_score: float) -> bool:
        return final_score >= self.BLOCK_THRESHOLD
