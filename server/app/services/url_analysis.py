import ipaddress
import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

from app.utils.email_parser import extract_domain

SHORTENERS = {
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd", "buff.ly",
}
BLACKLISTED_DOMAINS = {
    "paypaI.com", "microsft.com", "amaz0n.com", "secure-login-bank.net",
    "microsoft-update.com", "dhl-shipping.xyz",
}


@dataclass
class URLAnalysisResult:
    score: float = 0.0
    flagged_urls: list[str] = field(default_factory=list)
    findings: list[str] = field(default_factory=list)
    has_suspicious_domain: bool = False


class URLAnalysisService:
    """Detect malicious and suspicious URLs in email content."""

    MAX_SCORE = 100.0
    HOMOGRAPH_PATTERN = re.compile(r"[^\x00-\x7F]")

    def analyze(self, urls: list[str]) -> URLAnalysisResult:
        findings: list[str] = []
        flagged: list[str] = []
        score = 0.0
        has_suspicious_domain = False

        if not urls:
            return URLAnalysisResult(score=0.0, findings=["No URLs detected"])

        for url in urls:
            url_score, url_findings = self._analyze_single_url(url)
            if url_score > 0:
                flagged.append(url)
                findings.extend(url_findings)
                score += url_score
                if url_score >= 25:  # Consider high-scoring URLs as suspicious domains
                    has_suspicious_domain = True

        # Cap based on number of URLs
        score = min(score, self.MAX_SCORE)

        if len(urls) > 10:
            score = min(score + 10, self.MAX_SCORE)
            findings.append("Excessive number of URLs in email")

        return URLAnalysisResult(
            score=score, 
            flagged_urls=flagged, 
            findings=findings,
            has_suspicious_domain=has_suspicious_domain
        )

    def _analyze_single_url(self, url: str) -> tuple[float, list[str]]:
        findings: list[str] = []
        score = 0.0

        try:
            parsed = urlparse(url)
            domain = (parsed.hostname or "").lower()
        except Exception:
            return 30.0, ["Malformed URL"]

        if url.startswith("http://"):
            score += 10
            findings.append(f"Non-HTTPS URL: {url}")

        if len(url) > 200:
            score += 10
            findings.append(f"Very long URL detected: {url[:50]}...")

        if domain in SHORTENERS:
            score += 20
            findings.append(f"Shortened URL detected: {url}")

        try:
            ipaddress.ip_address(domain)
            score += 25
            findings.append(f"IP address used as URL host: {url}")
        except ValueError:
            pass

        if domain in BLACKLISTED_DOMAINS:
            score += 40
            findings.append(f"Blacklisted domain: {domain}")

        if self.HOMOGRAPH_PATTERN.search(domain):
            score += 30
            findings.append(f"Homograph/suspicious characters in domain: {domain}")

        # Typosquatting heuristic
        suspicious_patterns = ["paypa", "microsft", "amaz0n", "g00gle", "apple-id"]
        if any(p in domain for p in suspicious_patterns):
            score += 25
            findings.append(f"Possible typosquatting domain: {domain}")

        return score, findings
