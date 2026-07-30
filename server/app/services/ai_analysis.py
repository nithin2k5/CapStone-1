from dataclasses import dataclass, field

from app.utils.email_parser import ParsedEmail


@dataclass
class AIAnalysisResult:
    phishing_probability: float = 0.0
    spam_probability: float = 0.0
    score: float = 0.0
    reasons: list[str] = field(default_factory=list)


class AIAnalysisService:
    """
    Placeholder AI analysis service.
    Interface ready for future LLM/ML integration.
    Do NOT integrate any LLM in MVP.
    """

    PHISHING_KEYWORDS = [
        "urgent", "verify your account", "password reset", "suspended",
        "click here immediately", "wire transfer", "invoice attached",
        "confirm your identity", "unusual activity", "act now",
    ]

    SPAM_KEYWORDS = [
        "free", "winner", "congratulations", "lottery", "prize",
        "limited time", "buy now", "discount", "offer expires",
    ]

    def analyze(self, parsed: ParsedEmail) -> AIAnalysisResult:
        """
        Mock heuristic-based analysis simulating AI output.
        Replace with LLM/ML model in future versions.
        """
        combined = f"{parsed.subject} {parsed.body_text} {parsed.body_html}".lower()
        reasons: list[str] = []

        phishing_hits = sum(1 for kw in self.PHISHING_KEYWORDS if kw in combined)
        spam_hits = sum(1 for kw in self.SPAM_KEYWORDS if kw in combined)

        phishing_prob = min(phishing_hits * 15.0, 100.0)
        spam_prob = min(spam_hits * 10.0, 100.0)

        if phishing_hits:
            reasons.append(f"Detected {phishing_hits} phishing indicator(s) in content")
        if spam_hits:
            reasons.append(f"Detected {spam_hits} spam indicator(s) in content")
        if "!" in parsed.subject and parsed.subject.count("!") > 2:
            reasons.append("Excessive urgency punctuation in subject")
            phishing_prob = min(phishing_prob + 10, 100)

        score = max(phishing_prob, spam_prob * 0.7)

        return AIAnalysisResult(
            phishing_probability=phishing_prob,
            spam_probability=spam_prob,
            score=min(score, 100.0),
            reasons=reasons or ["No AI indicators detected"],
        )

    async def analyze_with_llm(self, parsed: ParsedEmail) -> AIAnalysisResult:
        """Future LLM integration point."""
        raise NotImplementedError("LLM integration not yet implemented")
