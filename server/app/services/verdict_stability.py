"""Bounded, repeated experiments on the classifier, not a proof of malice."""

import asyncio
import hashlib
import math
from dataclasses import dataclass, field
from statistics import median

from app.core.config import get_settings
from app.services.ai_analysis import AIAnalysisResult, AIAnalysisService
from app.utils.email_parser import INVISIBLE_CODEPOINTS, ParsedEmail


@dataclass
class StabilityResult:
    ran: bool = False
    degraded: bool = False
    review_required: bool = False
    inconclusive: bool = False
    skipped_reason: str = ""
    control_scores: list[float] = field(default_factory=list)
    noise_range: float = 0.0
    threshold: float = 15.0
    variants: list[dict] = field(default_factory=list)
    calls: int = 0
    findings: list[str] = field(default_factory=list)


def body_hash(body: str) -> str:
    return hashlib.sha256(body.encode()).hexdigest()


def reconstructed_body(parsed: ParsedEmail, hidden: str) -> str:
    return f"{parsed.rendered.visible_text}\n{hidden}".strip()


def effect(scores: list[float], controls: list[float], threshold: float) -> str:
    """Every repeat must clear the control envelope, in the same direction."""
    if max(scores) <= min(controls) - threshold:
        return "suppression"
    if min(scores) >= max(controls) + threshold:
        return "escalation"
    return ""


async def checked_score(ai, parsed, body: str) -> float:
    result = await ai.analyze_body(parsed, body, disclose_concealment=False)
    if result.degraded or result.source != "llm":
        raise ValueError("A model result is required")
    if not math.isfinite(result.score) or not 0 <= result.score <= 100:
        raise ValueError("Invalid model score")
    return float(result.score)


class VerdictStabilityService:
    # Each body fits in one existing model chunk. No silent sampling/truncation.
    MAX_BODY_CHARS = 6000
    TIMEOUT_SECONDS = 45

    def __init__(self, ai_service=None, enabled=None):
        self.ai = ai_service or AIAnalysisService()
        self.enabled = get_settings().verdict_stability_enabled if enabled is None else enabled

    async def analyze(self, parsed: ParsedEmail, visible: AIAnalysisResult) -> StabilityResult:
        result = StabilityResult()
        if not self.enabled:
            result.skipped_reason = "Verdict stability testing disabled"
            return result
        if visible.degraded or visible.source != "llm":
            result.skipped_reason = "No healthy model available"
            return result
        rendered = parsed.rendered
        if not rendered or len(rendered.hidden_text.strip()) < 16:
            result.skipped_reason = "No substantial concealed text"
            return result
        hidden = rendered.hidden_text
        variants = [
            ("as_ingested", rendered.machine_text),
            ("reconstructed_hidden", reconstructed_body(parsed, hidden)),
            ("normalized_hidden", reconstructed_body(parsed, " ".join(
                INVISIBLE_CODEPOINTS.sub("", hidden).split()
            ))),
        ]
        if max(len(rendered.visible_text), *(len(body) for _, body in variants)) > self.MAX_BODY_CHARS:
            result.skipped_reason = "Body exceeds the 6000-character experiment budget"
            return result

        async def score(body):
            result.calls += 1
            return await checked_score(self.ai, parsed, body)

        try:
            async with asyncio.timeout(self.TIMEOUT_SECONDS):
                # Do not reuse the main score: its prompt discloses concealment.
                for _ in range(3):
                    result.control_scores.append(await score(rendered.visible_text))
                result.noise_range = max(result.control_scores) - min(result.control_scores)
                result.threshold = max(15.0, result.noise_range + 5.0)
                if result.noise_range >= 15:
                    result.inconclusive = True
                    result.review_required = True
                    result.findings.append("Identical control inputs produced unstable scores; attribution is inconclusive")
                else:
                    cache = {}
                    for name, body in variants:
                        if body not in cache:
                            cache[body] = [await score(body), await score(body)]
                        scores = cache[body]
                        direction = effect(scores, result.control_scores, result.threshold)
                        result.variants.append({
                            "name": name, "scores": scores, "body_sha256": body_hash(body),
                            "direction": direction, "reproducible": bool(direction),
                            "delta": round(median(scores) - median(result.control_scores), 2),
                        })
                        result.review_required |= bool(direction)
                    result.findings.append(
                        "Concealed-content variants reproducibly changed the verdict; review required"
                        if result.review_required else "No reproducible change in the tested variants"
                    )
                result.ran = True
        except Exception:
            result.degraded = True
            result.findings.append("Stability experiment incomplete: model failure or time budget exceeded")
        return result
