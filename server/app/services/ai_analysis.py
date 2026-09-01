import os
import json
import openai
from dataclasses import dataclass, field

from app.utils.email_parser import ParsedEmail


@dataclass
class AIAnalysisResult:
    phishing_probability: float = 0.0
    spam_probability: float = 0.0
    score: float = 0.0
    reasons: list[str] = field(default_factory=list)
    is_urgent: bool = False
    requests_financials: bool = False
    requests_credentials: bool = False


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
        is_urgent = False
        if "!" in parsed.subject and parsed.subject.count("!") > 2:
            reasons.append("Excessive urgency punctuation in subject")
            phishing_prob = min(phishing_prob + 10, 100)
            is_urgent = True
            
        urgent_kws = ["urgent", "act now", "immediate action", "final notice"]
        if any(kw in combined for kw in urgent_kws):
            is_urgent = True
            
        requests_financials = False
        financial_kws = ["wire transfer", "invoice attached", "update payment", "paypal"]
        if any(kw in combined for kw in financial_kws):
            requests_financials = True
            
        requests_credentials = False
        credential_kws = ["verify your account", "password reset", "login attempt", "confirm your identity"]
        if any(kw in combined for kw in credential_kws):
            requests_credentials = True

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
            is_urgent=is_urgent,
            requests_financials=requests_financials,
            requests_credentials=requests_credentials,
        )

    async def analyze_with_llm(self, parsed: ParsedEmail) -> AIAnalysisResult:
        """Real LLM integration for intent and social engineering analysis using OpenAI."""
        
        email_content = f"""
        Sender: {parsed.sender}
        Subject: {parsed.subject}
        Body: {parsed.body_text[:2000]} 
        URLs present: {', '.join(parsed.urls)}
        """

        system_prompt = """
        You are an advanced cybersecurity email analyzer. Analyze the provided email for:
        1. Social engineering tactics (urgency, fear, greed)
        2. Suspicious sender-to-content mismatches (e.g. sender is a random Gmail, but claims to be IT)
        3. Credential harvesting context
        
        Return ONLY a JSON response in this exact format:
        {
            "phishing_probability": <float 0-100>,
            "spam_probability": <float 0-100>,
            "reasons": ["<reason 1>", "<reason 2>"],
            "is_urgent": <bool>,
            "requests_financials": <bool>,
            "requests_credentials": <bool>
        }
        """

        try:
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            
            if gemini_api_key:
                from google import genai
                from google.genai import types
                
                client = genai.Client(api_key=gemini_api_key)
                
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=email_content,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        response_mime_type="application/json",
                        temperature=0.1,
                    )
                )
                result = json.loads(response.text)
            else:
                # Fallback to local OpenAI-compatible server if GEMINI_API_KEY is not set
                import openai
                client = openai.AsyncOpenAI(
                    base_url=os.getenv("LOCAL_LLM_URL", "http://localhost:11434/v1"),
                    api_key="local-llm" 
                )
                
                response = await client.chat.completions.create(
                    model=os.getenv("LOCAL_LLM_MODEL", "llama3"), 
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": email_content}
                    ],
                    response_format={ "type": "json_object" }
                )
                
                result = json.loads(response.choices[0].message.content)
            
            score = max(result.get("phishing_probability", 0.0), result.get("spam_probability", 0.0) * 0.7)
            
            return AIAnalysisResult(
                phishing_probability=result.get("phishing_probability", 0.0),
                spam_probability=result.get("spam_probability", 0.0),
                score=min(score, 100.0),
                reasons=result.get("reasons", ["No specific reasons provided by AI."]),
                is_urgent=result.get("is_urgent", False),
                requests_financials=result.get("requests_financials", False),
                requests_credentials=result.get("requests_credentials", False)
            )
            
        except Exception as e:
            print(f"LLM analysis failed: {e}. Falling back to heuristic analysis.")
            return self.analyze(parsed)

