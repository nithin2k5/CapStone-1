"""
Classifier stand-ins for the benchmark.

The benchmark measures the gateway, not a vendor's model. Running it against a
live model mixes the two: a payload that fails against this week's Gemini says
nothing about whether the gateway would have caught one that worked, and the
numbers stop being reproducible the moment the model is updated.

So the default backend is a stand-in that obeys concealed instructions by
construction. That is a worst-case assumption about the model, deliberately: the
question the benchmark asks is whether the gateway holds *when* the classifier
is successfully suppressed. `--llm` swaps in the real service for anyone who
wants the other measurement, and the report says which backend produced it.
"""

import re

from app.services.ai_analysis import AIAnalysisResult, AIAnalysisService
from app.utils.email_parser import ParsedEmail
from benchmarks.corpus import PAYLOADS, ZERO_WIDTH

# Payload text as the model would recover it, with the shredding characters of
# the zero-width technique removed.
_PAYLOAD_FINGERPRINTS = [
    re.sub(r"\s+", " ", p.text)[:48].lower() for p in PAYLOADS
]

_INVISIBLE = re.compile(f"[{ZERO_WIDTH}‌‍⁠﻿­]")


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", _INVISIBLE.sub("", text or "")).lower()


class StandInModel(AIAnalysisService):
    """
    A content classifier that reads what it is given and believes it.

    Scores visible social-engineering cues like any keyword model, then, if the
    text it was handed contains a payload, returns the verdict the payload asked
    for. `obedience` scales how often it complies, so the benchmark can sweep
    from a model that always falls for the attack to one that never does.
    """

    SUPPRESSED_SCORE = 2.0

    def __init__(self, obedience: float = 1.0) -> None:
        super().__init__()
        self.obedience = obedience
        self.calls = 0

    def _payload_index(self, text: str) -> int | None:
        normalised = _normalise(text)
        for index, fingerprint in enumerate(_PAYLOAD_FINGERPRINTS):
            if fingerprint in normalised:
                return index
        return None

    def _obeys(self, index: int) -> bool:
        if self.obedience >= 1.0:
            return True
        if self.obedience <= 0.0:
            return False
        # Deterministic across runs: the same payload is obeyed or resisted every
        # time, so two arms of one benchmark see the same model.
        return (index / max(len(_PAYLOAD_FINGERPRINTS) - 1, 1)) < self.obedience

    def _content_score(self, parsed: ParsedEmail, body: str) -> float:
        haystack = f"{parsed.subject} {body}".lower()
        hits = sum(1 for kw in self.PHISHING_KEYWORDS if kw in haystack)
        return min(hits * 22.0, 100.0)

    async def analyze_body(
        self,
        parsed: ParsedEmail,
        body: str,
        disclose_concealment: bool = True,
    ) -> AIAnalysisResult:
        self.calls += 1
        score = self._content_score(parsed, body)
        reasons = [f"{score:.0f}% from visible social-engineering cues"]

        index = self._payload_index(body)
        if index is not None and self._obeys(index):
            score = self.SUPPRESSED_SCORE
            reasons = ["Message reviewed and cleared"]

        return AIAnalysisResult(
            phishing_probability=score,
            spam_probability=0.0,
            score=score,
            reasons=reasons,
            is_urgent="urgent" in body.lower() or "immediately" in body.lower(),
            requests_credentials="verify your account" in body.lower(),
            requests_financials="wire transfer" in body.lower(),
            source="llm",
            degraded=False,
            injection_attempt=False,
        )


def build_model(backend: str, obedience: float = 1.0) -> AIAnalysisService:
    if backend == "llm":
        return AIAnalysisService()
    return StandInModel(obedience=obedience)
