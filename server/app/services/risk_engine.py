from dataclasses import dataclass, field

from app.database.models import RiskLevel
from app.services.ai_analysis import AIAnalysisResult
from app.services.attachment_analysis import AttachmentAnalysisResult
from app.services.header_analysis import HeaderAnalysisResult
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
    findings: dict = field(default_factory=dict)


class RiskEngine:
    """
    Aggregate analysis scores into a final risk assessment.
    Weights are configurable for future tuning.
    """

    WEIGHTS = {
        "header": 0.30,
        "url": 0.25,
        "attachment": 0.25,
        "ai": 0.20,
    }

    QUARANTINE_THRESHOLD = 60.0
    BLOCK_THRESHOLD = 80.0

    def calculate(
        self,
        header: HeaderAnalysisResult,
        url: URLAnalysisResult,
        attachment: AttachmentAnalysisResult,
        ai: AIAnalysisResult,
    ) -> RiskEngineResult:
        final_score = (
            header.score * self.WEIGHTS["header"]
            + url.score * self.WEIGHTS["url"]
            + attachment.score * self.WEIGHTS["attachment"]
            + ai.score * self.WEIGHTS["ai"]
        )
        final_score = round(min(final_score, 100.0), 2)

        risk_level_str = score_to_risk_level(final_score)
        risk_level = RiskLevel(risk_level_str)

        explanation_parts = []
        if header.findings:
            explanation_parts.append(f"Header: {len(header.findings)} issue(s)")
        if url.findings:
            explanation_parts.append(f"URLs: {len(url.flagged_urls)} flagged")
        if attachment.findings:
            explanation_parts.append(f"Attachments: {len(attachment.findings)} concern(s)")
        if ai.reasons:
            explanation_parts.append(f"AI: {ai.phishing_probability:.0f}% phishing probability")

        explanation = "; ".join(explanation_parts) or "No significant threats detected"

        return RiskEngineResult(
            header_score=round(header.score, 2),
            url_score=round(url.score, 2),
            attachment_score=round(attachment.score, 2),
            ai_score=round(ai.score, 2),
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
                },
            },
        )

    def should_quarantine(self, final_score: float) -> bool:
        return final_score >= self.QUARANTINE_THRESHOLD

    def should_block(self, final_score: float) -> bool:
        return final_score >= self.BLOCK_THRESHOLD
