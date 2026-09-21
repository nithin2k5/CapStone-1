from dataclasses import dataclass, field

from app.services.dkim_verification import DKIMVerificationResult
from app.utils.email_parser import ParsedEmail, extract_domain


@dataclass
class HeaderAnalysisResult:
    score: float = 0.0
    findings: list[str] = field(default_factory=list)
    reply_to_mismatch: bool = False
    failed_dmarc: bool = False
    auth_unavailable: bool = False
    # True when the DKIM verdict came from checking the signature here rather
    # than from the Authentication-Results header, which the sender can write.
    dkim_verified_locally: bool = False


def auth_verdict(value: str | None) -> str:
    """
    Classify an authentication result into pass / fail / none / unknown.

    "none" (the domain publishes no policy) and "unknown" (we never obtained the
    result) are different states, and neither is a failure. Collapsing them into
    one another either fabricates a pass or invents a failure.
    """
    if value is None or not value.strip():
        return "unknown"

    token = value.strip().lower()
    if "pass" in token:
        return "pass"
    if any(marker in token for marker in ("fail", "temperror", "permerror", "error")):
        return "fail"
    if "none" in token:
        return "none"
    return "unknown"


class HeaderAnalysisService:
    """Analyze email authentication headers and sender anomalies."""

    MAX_SCORE = 100.0

    # Full weight when a mechanism explicitly fails or publishes no policy; half
    # weight when the result was never available, which is a gap in our own
    # visibility rather than evidence against the sender.
    AUTH_WEIGHTS = {"spf": 25.0, "dkim": 25.0, "dmarc": 20.0}
    UNKNOWN_FACTOR = 0.5

    def _score_auth(
        self, mechanism: str, value: str | None, findings: list[str]
    ) -> tuple[float, str]:
        verdict = auth_verdict(value)
        weight = self.AUTH_WEIGHTS[mechanism]
        label = mechanism.upper()

        if verdict == "pass":
            return 0.0, verdict
        if verdict == "fail":
            findings.append(f"{label} validation failed")
            return weight, verdict
        if verdict == "none":
            findings.append(f"{label} not published by sender domain")
            return weight, verdict

        findings.append(f"{label} result unavailable — sender not verified")
        return weight * self.UNKNOWN_FACTOR, verdict

    def _score_local_dkim(
        self, local: DKIMVerificationResult, reported: str | None, findings: list[str]
    ) -> tuple[float, str]:
        """
        Score a DKIM verdict we produced ourselves.

        This one is not a report we are choosing to believe, so it takes the full
        weight of an "unknown" away: a signature that verifies against the key the
        signing domain publishes could not have been asserted by the sender.
        """
        weight = self.AUTH_WEIGHTS["dkim"]
        verdict = local.verdict

        if verdict == "pass":
            findings.append(f"DKIM signature verified locally ({local.domain})")
            contribution = 0.0
        elif verdict == "fail":
            findings.append(
                f"DKIM signature failed local verification ({local.domain}) — "
                "the message does not match what the signing domain signed"
            )
            contribution = weight
        else:  # "none"
            findings.append("DKIM not signed by sender domain (checked locally)")
            contribution = weight

        # A reported pass alongside a local failure means the message was altered
        # after the receiving server checked it, or the header was written by
        # someone who never performed the check.
        if verdict == "fail" and auth_verdict(reported) == "pass":
            findings.append(
                "Authentication-Results reports a DKIM pass that local "
                "verification contradicts"
            )

        return contribution, verdict

    def analyze(
        self,
        parsed: ParsedEmail,
        dkim_local: DKIMVerificationResult | None = None,
    ) -> HeaderAnalysisResult:
        findings: list[str] = []
        score = 0.0
        reply_to_mismatch = False

        spf_score, spf_verdict = self._score_auth("spf", parsed.spf, findings)

        # Prefer a signature we checked over a verdict we were handed.
        if dkim_local is not None and dkim_local.is_local:
            dkim_score, dkim_verdict = self._score_local_dkim(
                dkim_local, parsed.dkim, findings
            )
            dkim_verified_locally = True
        else:
            dkim_score, dkim_verdict = self._score_auth("dkim", parsed.dkim, findings)
            dkim_verified_locally = False
            if dkim_local is not None and dkim_local.detail:
                findings.append(f"Local DKIM check skipped: {dkim_local.detail}")

        dmarc_score, dmarc_verdict = self._score_auth("dmarc", parsed.dmarc, findings)
        score += spf_score + dkim_score + dmarc_score

        # Only an explicit failure or absent policy counts as a DMARC failure for the
        # compounding rules; an unavailable result must not trigger them.
        failed_dmarc = dmarc_verdict in ("fail", "none")
        auth_unavailable = "unknown" in (spf_verdict, dkim_verdict, dmarc_verdict)

        # A locally failed signature is tamper evidence for the whole message, so
        # it carries the DMARC compounding rules even when the reported DMARC
        # result says otherwise.
        if dkim_verified_locally and dkim_verdict == "fail":
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
            auth_unavailable=auth_unavailable,
            dkim_verified_locally=dkim_verified_locally,
        )
