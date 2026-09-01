from dataclasses import dataclass, field

from app.utils.email_parser import ParsedEmail, extract_domain


@dataclass
class HeaderAnalysisResult:
    score: float = 0.0
    findings: list[str] = field(default_factory=list)
    reply_to_mismatch: bool = False
    failed_dmarc: bool = False


class HeaderAnalysisService:
    """Analyze email authentication headers and sender anomalies."""

    MAX_SCORE = 100.0

    def analyze(self, parsed: ParsedEmail) -> HeaderAnalysisResult:
        findings: list[str] = []
        score = 0.0
        failed_dmarc = False
        reply_to_mismatch = False

        if not parsed.spf or "fail" in (parsed.spf or "").lower():
            score += 25
            findings.append("SPF validation failed or missing")

        if not parsed.dkim or "fail" in (parsed.dkim or "").lower():
            score += 25
            findings.append("DKIM validation failed or missing")

        if not parsed.dmarc or "fail" in (parsed.dmarc or "").lower():
            score += 20
            findings.append("DMARC validation failed or missing")
            failed_dmarc = True

        sender_domain = extract_domain(parsed.sender)
        reply_domain = extract_domain(parsed.reply_to) if parsed.reply_to else ""

        if parsed.reply_to and reply_domain and sender_domain != reply_domain:
            score += 20
            findings.append("Reply-To domain mismatch with sender")
            reply_to_mismatch = True

        if parsed.return_path:
            return_domain = extract_domain(parsed.return_path)
            if return_domain and sender_domain and return_domain != sender_domain:
                score += 15
                findings.append("Suspicious Return-Path domain mismatch")
                reply_to_mismatch = True

        if len(parsed.received_chain) > 5:
            score += 10
            findings.append("Excessive Received header chain")

        if not parsed.message_id or len(parsed.message_id) < 10:
            score += 10
            findings.append("Missing or suspicious Message-ID")

        if parsed.sender and "@" not in parsed.sender:
            score += 15
            findings.append("Malformed sender address")

        return HeaderAnalysisResult(
            score=min(score, self.MAX_SCORE),
            findings=findings,
            reply_to_mismatch=reply_to_mismatch,
            failed_dmarc=failed_dmarc,
        )
