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
        "account suspended", "login attempt", "security alert",
        "unauthorized access", "update payment", "validate your account",
        "action required", "immediate action", "final notice",
        "account locked", "deactivation", "renew now"
    ]

    SPAM_KEYWORDS = [
        "free", "winner", "congratulations", "lottery", "prize",
        "limited time", "buy now", "discount", "offer expires",
        "earn money", "investment", "guaranteed", "no risk",
        "act now", "exclusive offer", "gift card", "claim your",
        "cash prize", "double your income", "clearance"
    ]

    def analyze(self, parsed: ParsedEmail) -> AIAnalysisResult:
        """
        Heuristic-based analysis simulating AI output.
        Replace with LLM/ML model in future versions.
        """
        combined = f"{parsed.subject} {parsed.body_text} {parsed.body_html}".lower()
        reasons: list[str] = []

        phishing_hits = sum(1 for kw in self.PHISHING_KEYWORDS if kw in combined)
        spam_hits = sum(1 for kw in self.SPAM_KEYWORDS if kw in combined)
        
        # Base probabilities from keywords
        phishing_prob = min(phishing_hits * 15.0, 100.0)
        spam_prob = min(spam_hits * 10.0, 100.0)

        if phishing_hits:
            reasons.append(f"Detected {phishing_hits} phishing indicator(s) in content")
        if spam_hits:
            reasons.append(f"Detected {spam_hits} spam indicator(s) in content")
            
        # Urgency/Punctuation heuristics
        if "!" in parsed.subject and parsed.subject.count("!") > 2:
            reasons.append("Excessive urgency punctuation in subject")
            phishing_prob = min(phishing_prob + 10, 100)
            
        if parsed.subject.isupper():
            reasons.append("Subject is entirely uppercase")
            spam_prob = min(spam_prob + 15, 100)
            
        # Link density heuristic
        url_count = len(parsed.urls)
        text_length = len(parsed.body_text or "")
        if url_count > 3 and text_length < 200:
            reasons.append("High ratio of links to text (potential credential harvesting)")
            phishing_prob = min(phishing_prob + 20, 100)
            
        # Sender discrepancy heuristic (simulated)
        if "google.com" in combined and "google.com" not in parsed.sender.lower():
            reasons.append("Mentions 'google.com' but sender is not Google")
            phishing_prob = min(phishing_prob + 25, 100)
            
        if "paypal" in combined and "paypal.com" not in parsed.sender.lower():
            reasons.append("Mentions 'paypal' but sender is not PayPal")
            phishing_prob = min(phishing_prob + 25, 100)

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
