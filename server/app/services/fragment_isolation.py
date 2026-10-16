"""Find a small effect-preserving subset of concealed text under a fixed budget."""

import asyncio
import re
from dataclasses import dataclass, field

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.verdict_stability import (
    StabilityResult,
    body_hash,
    checked_score,
    effect,
    reconstructed_body,
)

logger = get_logger("fragment_isolation")


@dataclass
class IsolationResult:
    ran: bool = False
    degraded: bool = False
    reproduced: bool = False
    budget_exhausted: bool = False
    skipped_reason: str = ""
    fragment: str = ""
    source_sha256: str = ""
    source_ranges: list[list[int]] = field(default_factory=list)
    original_chars: int = 0
    direction: str = ""
    control_scores: list[float] = field(default_factory=list)
    fragment_scores: list[float] = field(default_factory=list)
    trials: list[dict] = field(default_factory=list)
    calls: int = 0


class FragmentIsolationService:
    MAX_CALLS = 16
    TIMEOUT_SECONDS = 45

    def __init__(self, ai_service, enabled=None):
        self.ai = ai_service
        self.enabled = (
            get_settings().fragment_isolation_enabled if enabled is None else enabled
        )

    async def analyze(self, parsed, stability: StabilityResult) -> IsolationResult:
        result = IsolationResult()
        if not self.enabled:
            result.skipped_reason = "Fragment isolation disabled"
            return result
        seed = next(
            (
                v
                for v in stability.variants
                if v["name"] == "reconstructed_hidden" and v["reproducible"]
            ),
            None,
        )
        if (
            not stability.ran
            or stability.degraded
            or stability.inconclusive
            or not seed
        ):
            result.skipped_reason = "No reproducible reconstructed hidden-text effect"
            return result

        hidden = parsed.rendered.hidden_text
        tokens = list(re.finditer(r"\S+\s*", hidden))
        if not tokens or len(reconstructed_body(parsed, hidden)) > 6000:
            result.skipped_reason = "Fragment exceeds experiment bounds"
            return result
        result.source_sha256 = body_hash(hidden)
        result.original_chars = len(hidden)
        result.direction = seed["direction"]
        kept = list(range(len(tokens)))

        def fragment(indices):
            return "".join(tokens[i].group() for i in indices).strip()

        async def score(body):
            result.calls += 1
            return await checked_score(self.ai, parsed, body)

        async def preserves(indices):
            body = reconstructed_body(parsed, fragment(indices))
            scores = [await score(body), await score(body)]
            direction = effect(scores, stability.control_scores, stability.threshold)
            result.trials.append(
                {
                    "body_sha256": body_hash(body),
                    "chars": len(fragment(indices)),
                    "scores": scores,
                    "preserved": direction == result.direction,
                }
            )
            return direction == result.direction

        try:
            async with asyncio.timeout(self.TIMEOUT_SECONDS):
                # Delta debugging by deletion. Reserve four calls for a fresh
                # control pair and final fragment confirmation, never claim a
                # globally smallest payload from a bounded local search.
                granularity = 2
                while len(kept) >= 2 and result.calls + 2 <= self.MAX_CALLS - 4:
                    width = (len(kept) + granularity - 1) // granularity
                    reduced = False
                    for start in range(0, len(kept), width):
                        if result.calls + 2 > self.MAX_CALLS - 4:
                            break
                        candidate = kept[:start] + kept[start + width :]
                        if candidate and await preserves(candidate):
                            kept = candidate
                            granularity = max(2, granularity - 1)
                            reduced = True
                            break
                    if not reduced:
                        if granularity >= len(kept):
                            break
                        granularity = min(len(kept), granularity * 2)
                result.budget_exhausted = result.calls >= self.MAX_CALLS - 4
                result.fragment = fragment(kept)
                result.control_scores = [
                    await score(parsed.rendered.visible_text) for _ in range(2)
                ]
                result.fragment_scores = [
                    await score(reconstructed_body(parsed, result.fragment))
                    for _ in range(2)
                ]
                controls = stability.control_scores + result.control_scores
                # A drifted model cannot confirm a causal attribution.
                result.reproduced = (
                    max(controls) - min(controls) < 15
                    and effect(result.fragment_scores, controls, stability.threshold)
                    == result.direction
                )
                for index in kept:
                    start, end = tokens[index].span()
                    if result.source_ranges and result.source_ranges[-1][1] == start:
                        result.source_ranges[-1][1] = end
                    else:
                        result.source_ranges.append([start, end])
                result.ran = True
        except Exception:
            logger.exception("Fragment isolation experiment failed")
            result.degraded = True
            result.skipped_reason = (
                "Isolation incomplete: model failure or time budget exceeded"
            )
        return result
