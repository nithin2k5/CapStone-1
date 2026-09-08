from dataclasses import dataclass, field

from app.database.models import RiskLevel
from app.services.ai_analysis import AIAnalysisResult
from app.services.attachment_analysis import AttachmentAnalysisResult
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

    def calculate(
        self,
        header: HeaderAnalysisResult,
        url: URLAnalysisResult,
        attachment: AttachmentAnalysisResult,
        ai: AIAnalysisResult,
        perceptual: PerceptualAnalysisResult | None = None,
    ) -> RiskEngineResult:
        perceptual = perceptual or PerceptualAnalysisResult()

        # Base additive score
        base_score = (
            header.score * self.WEIGHTS["header"]
            + url.score * self.WEIGHTS["url"]
            + attachment.score * self.WEIGHTS["attachment"]
            + ai.score * self.WEIGHTS["ai"]
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

        if ai.injection_attempt:
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
        if ai.injection_attempt:
            floor = max(floor, self.QUARANTINE_THRESHOLD)
            floor_reasons.append("an analyser-reported injection attempt")

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
