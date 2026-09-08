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
        # Base additive score
        base_score = (
            header.score * self.WEIGHTS["header"]
            + url.score * self.WEIGHTS["url"]
            + attachment.score * self.WEIGHTS["attachment"]
            + ai.score * self.WEIGHTS["ai"]
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

        final_score = base_score * multiplier
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
                    "source": ai.source,
                    "degraded": ai.degraded,
                },
            },
        )

    def should_quarantine(self, final_score: float) -> bool:
        return final_score >= self.QUARANTINE_THRESHOLD

    def should_block(self, final_score: float) -> bool:
        return final_score >= self.BLOCK_THRESHOLD
