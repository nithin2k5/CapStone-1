"""
Run the concealed-instruction benchmark.

Three arms score the same messages, so each row of the report isolates one
decision rather than a whole product:

  flat        an ordinary gateway — flatten the HTML, hand the text to the
              classifier, score what comes back. No notion of a hidden half.
  perceptual  visible text to the classifier, concealed text to the pattern-based
              perceptual analyser.
  probe       the above, plus the differential probe measuring what the concealed
              half does to the verdict.

The interesting column is the third minus the second: payloads written outside
the pattern list are what separates a detector that reads syntax from one that
measures effect.

    python -m benchmarks.run                    # stand-in model, offline, ~1s
    python -m benchmarks.run --llm              # against the configured model
    python -m benchmarks.run --json report.json
"""

import argparse
import asyncio
import json
from collections import defaultdict
from dataclasses import dataclass, field

from app.services.attachment_analysis import AttachmentAnalysisService
from app.services.differential_probe import DifferentialProbeService
from app.services.header_analysis import HeaderAnalysisService
from app.services.perceptual_analysis import PerceptualAnalysisService
from app.services.risk_engine import RiskEngine
from app.services.url_analysis import URLAnalysisService
from app.utils.email_parser import parse_email_content
from benchmarks.corpus import PAYLOADS, TECHNIQUES, Case, build_corpus
from benchmarks.models import build_model

ARMS = ("flat", "perceptual", "probe")


@dataclass
class CaseResult:
    case: Case
    scores: dict[str, float] = field(default_factory=dict)
    suppression: float = 0.0

    def caught(self, arm: str) -> bool:
        return self.scores[arm] >= RiskEngine.QUARANTINE_THRESHOLD


class Harness:
    def __init__(self, backend: str = "stand-in", obedience: float = 1.0):
        self.backend = backend
        self.model = build_model(backend, obedience)
        self.header = HeaderAnalysisService()
        self.url = URLAnalysisService()
        self.attachment = AttachmentAnalysisService()
        self.perceptual = PerceptualAnalysisService()
        self.probe = DifferentialProbeService(self.model, enabled=True)
        self.engine = RiskEngine()

    async def _ai(self, parsed, body):
        try:
            return await self.model.analyze_body(parsed, body)
        except Exception:
            return self.model._degraded_fallback(parsed)

    async def score(self, case: Case) -> CaseResult:
        parsed = parse_email_content(case.headers, "", case.html)
        rendered = parsed.rendered

        header = self.header.analyze(parsed)
        url = self.url.analyze(parsed.urls)
        attachment = self.attachment.analyze(parsed.attachments)

        # Arm 1: the classifier reads the flattened document, concealment and all,
        # and no analyser is watching the difference.
        ingested = (rendered.machine_text if rendered else "") or parsed.body_text
        flat_ai = await self._ai(parsed, ingested)
        flat = self.engine.calculate(header, url, attachment, flat_ai)

        # Arms 2 and 3 share one pass over the visible text.
        visible_ai = await self._ai(parsed, parsed.visible_text or "")
        perceptual = self.perceptual.analyze(rendered)
        perceptual_only = self.engine.calculate(
            header, url, attachment, visible_ai, perceptual
        )

        probe = await self.probe.probe(parsed, visible_ai)
        full = self.engine.calculate(
            header, url, attachment, visible_ai, perceptual, probe
        )

        return CaseResult(
            case=case,
            scores={
                "flat": flat.final_score,
                "perceptual": perceptual_only.final_score,
                "probe": full.final_score,
            },
            suppression=probe.suppression,
        )


async def run(cases: list[Case], harness: Harness, concurrency: int) -> list[CaseResult]:
    semaphore = asyncio.Semaphore(concurrency)

    async def one(case: Case) -> CaseResult:
        async with semaphore:
            return await harness.score(case)

    return await asyncio.gather(*(one(case) for case in cases))


# --------------------------------------------------------------------------
# Reporting
# --------------------------------------------------------------------------


def _rate(hit: int, total: int) -> str:
    return f"{hit}/{total}" + (f" ({hit / total:.0%})" if total else "")


def _auc(positive: list[float], negative: list[float]) -> float | None:
    """
    Area under the ROC curve, by rank (Mann-Whitney U).

    The probability that a randomly chosen attacked message outranks a randomly
    chosen piece of benign mail. Ties count half, which matters here: arms that
    score whole families identically would otherwise look better than they are.
    """
    if not positive or not negative:
        return None
    wins = sum(
        1.0 if p > n else 0.5 if p == n else 0.0 for p in positive for n in negative
    )
    return wins / (len(positive) * len(negative))


def summarise(results: list[CaseResult]) -> dict:
    clean = {r.case.base: r for r in results if r.case.kind == "clean"}
    attacked = [r for r in results if r.case.attacked]
    decoys = [r for r in results if r.case.kind == "decoy"]

    summary: dict = {"arms": {}, "by_technique": {}, "by_payload": {}}

    for arm in ARMS:
        phish_clean = [r for r in clean.values() if r.case.label == "phish"]
        benign_clean = [r for r in clean.values() if r.case.label == "benign"]
        phish_attacked = [r for r in attacked if r.case.label == "phish"]
        benign_attacked = [r for r in attacked if r.case.label == "benign"]

        # A flip is the measurement the matched pairs exist for: the twin without
        # the payload was caught, the one with it was not. Nothing the recipient
        # sees changed, so the payload is the entire difference.
        #
        # Only pairs whose clean twin was caught can flip, so those are the
        # denominator. A message this arm misses anyway tells us nothing about
        # suppression, and counting it would quietly improve the rate.
        scorable = [r for r in phish_attacked if clean[r.case.base].caught(arm)]
        flips = [r for r in scorable if not r.caught(arm)]

        summary["arms"][arm] = {
            "phish_clean_caught": sum(r.caught(arm) for r in phish_clean),
            "phish_clean_total": len(phish_clean),
            "phish_attacked_caught": sum(r.caught(arm) for r in phish_attacked),
            "phish_attacked_total": len(phish_attacked),
            "flips": len(flips),
            "flip_scorable": len(scorable),
            "flip_rate": len(flips) / len(scorable) if scorable else None,
            # A benign-looking message carrying concealed instructions is an attack
            # whatever its visible half says, so catching it is correct.
            "carriers_caught": sum(r.caught(arm) for r in benign_attacked),
            "carriers_total": len(benign_attacked),
            "false_positives": sum(r.caught(arm) for r in benign_clean),
            "false_positive_total": len(benign_clean),
            "decoys_flagged": sum(r.caught(arm) for r in decoys),
            "decoys_total": len(decoys),
            # What the project claims to add, stated as a ranking: does a message
            # carrying a concealed payload outrank ordinary benign mail, including
            # the benign mail that conceals things for its own reasons?
            "auc": _auc(
                [r.scores[arm] for r in attacked],
                [r.scores[arm] for r in benign_clean + decoys],
            ),
            # The same ranking with the visible content held constant: benign mail
            # carrying a payload against benign mail without one. Nothing a header
            # or URL analyser can see differs between the two, so this isolates
            # detection of the concealed half from every other signal.
            "auc_carrier": _auc(
                [r.scores[arm] for r in benign_attacked],
                [r.scores[arm] for r in benign_clean + decoys],
            ),
        }

    by_technique: dict[str, dict] = defaultdict(lambda: defaultdict(int))
    by_payload: dict[str, dict] = defaultdict(lambda: defaultdict(int))
    for r in attacked:
        for bucket, key in (
            (by_technique, r.case.technique),
            (by_payload, r.case.payload),
        ):
            bucket[key]["total"] += 1
            for arm in ARMS:
                bucket[key][arm] += int(r.caught(arm))

    summary["by_technique"] = {k: dict(v) for k, v in by_technique.items()}
    summary["by_payload"] = {k: dict(v) for k, v in by_payload.items()}

    evading = [r for r in attacked if r.case.evades_patterns]
    summary["pattern_evading"] = {
        "total": len(evading),
        **{arm: sum(r.caught(arm) for r in evading) for arm in ARMS},
    }
    matching = [r for r in attacked if not r.case.evades_patterns]
    summary["pattern_matching"] = {
        "total": len(matching),
        **{arm: sum(r.caught(arm) for r in matching) for arm in ARMS},
    }
    return summary


def render(summary: dict, results: list[CaseResult], harness: Harness) -> str:
    lines: list[str] = []
    sweep_attacked = [r for r in results if r.case.attacked]
    sweep_negative = [
        r for r in results if r.case.label == "benign" and not r.case.attacked
    ]
    attacked = len(sweep_attacked)
    lines.append(
        f"Backend: {harness.backend}   Cases: {len(results)} "
        f"({attacked} attacked, {len(sweep_negative)} benign incl. decoys)"
    )
    lines.append("")

    header = f"{'':44}" + "".join(f"{arm:>16}" for arm in ARMS)
    lines.append(header)
    lines.append("-" * len(header))

    rows = [
        ("Phishing caught, no payload", "phish_clean_caught", "phish_clean_total"),
        ("Phishing caught, with payload", "phish_attacked_caught", "phish_attacked_total"),
        ("Benign carriers caught", "carriers_caught", "carriers_total"),
        ("False positives (clean benign)", "false_positives", "false_positive_total"),
        ("False positives (benign concealment)", "decoys_flagged", "decoys_total"),
    ]
    for label, hit_key, total_key in rows:
        cells = "".join(
            f"{_rate(summary['arms'][arm][hit_key], summary['arms'][arm][total_key]):>16}"
            for arm in ARMS
        )
        lines.append(f"{label:44}{cells}")

    flip_cells = ""
    for arm in ARMS:
        stats = summary["arms"][arm]
        if stats["flip_rate"] is None:
            flip_cells += f"{'n/a':>16}"
        else:
            flip_cells += f"{_rate(stats['flips'], stats['flip_scorable']):>16}"
    lines.append(f"{'Pairs flipped by the payload':44}{flip_cells}")

    auc_cells = "".join(
        f"{summary['arms'][arm]['auc']:>16.3f}"
        if summary["arms"][arm]["auc"] is not None
        else f"{'n/a':>16}"
        for arm in ARMS
    )
    lines.append(f"{'AUC, payload vs benign mail':44}{auc_cells}")

    carrier_cells = "".join(
        f"{summary['arms'][arm]['auc_carrier']:>16.3f}"
        if summary["arms"][arm]["auc_carrier"] is not None
        else f"{'n/a':>16}"
        for arm in ARMS
    )
    lines.append(f"{'AUC, concealed half alone':44}{carrier_cells}")

    if all(summary["arms"][arm]["flip_rate"] is None for arm in ARMS):
        lines.append("")
        lines.append(
            "  n/a: no clean phishing twin reached the quarantine threshold, so no "
            "pair could flip.\n"
            "  A pair only measures suppression once the unattacked message is "
            "caught in the first place;\n"
            "  see 'Known finding' in benchmarks/README.md."
        )
    lines.append("")

    lines.append("By payload wording")
    lines.append("-" * len(header))
    for label, key in (
        ("Wording the pattern list matches", "pattern_matching"),
        ("Wording written to evade it", "pattern_evading"),
    ):
        bucket = summary[key]
        cells = "".join(f"{_rate(bucket[arm], bucket['total']):>16}" for arm in ARMS)
        lines.append(f"{label:44}{cells}")
    lines.append("")

    lines.append("Threshold sweep (detection of attacked messages / false positives)")
    lines.append("-" * len(header))
    lines.append(f"{'threshold':44}" + "".join(f"{arm:>16}" for arm in ARMS))
    for threshold in (40.0, 50.0, 60.0, 70.0, 80.0):
        cells = ""
        for arm in ARMS:
            caught = sum(1 for r in sweep_attacked if r.scores[arm] >= threshold)
            fp = sum(1 for r in sweep_negative if r.scores[arm] >= threshold)
            cells += f"{f'{caught / max(len(sweep_attacked), 1):.0%} / {fp}':>16}"
        marker = "  <- operating point" if threshold == RiskEngine.QUARANTINE_THRESHOLD else ""
        lines.append(f"{threshold:<44.0f}{cells}{marker}")
    lines.append("")

    lines.append("By concealment technique (caught / total)")
    lines.append("-" * len(header))
    for technique, bucket in sorted(summary["by_technique"].items()):
        cells = "".join(f"{_rate(bucket[arm], bucket['total']):>16}" for arm in ARMS)
        lines.append(f"{technique:44}{cells}")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--llm",
        action="store_true",
        help="score with the configured model instead of the offline stand-in",
    )
    parser.add_argument(
        "--obedience",
        type=float,
        default=1.0,
        help="share of payloads the stand-in model falls for (default 1.0)",
    )
    parser.add_argument("--techniques", help="comma-separated subset of techniques")
    parser.add_argument("--payloads", help="comma-separated subset of payloads")
    parser.add_argument("--limit", type=int, help="score only the first N cases")
    parser.add_argument("--json", dest="json_path", help="write the summary as JSON")
    parser.add_argument(
        "--concurrency", type=int, default=4, help="in-flight model calls (default 4)"
    )
    args = parser.parse_args()

    unknown_t = set((args.techniques or "").split(",")) - set(TECHNIQUES) - {""}
    unknown_p = set((args.payloads or "").split(",")) - {p.id for p in PAYLOADS} - {""}
    if unknown_t or unknown_p:
        parser.error(f"unknown selection: {sorted(unknown_t | unknown_p)}")

    cases = build_corpus(
        techniques=args.techniques.split(",") if args.techniques else None,
        payloads=args.payloads.split(",") if args.payloads else None,
    )
    if args.limit:
        cases = cases[: args.limit]

    harness = Harness(
        backend="llm" if args.llm else "stand-in", obedience=args.obedience
    )
    results = asyncio.run(run(cases, harness, args.concurrency))
    summary = summarise(results)

    print(render(summary, results, harness))

    if args.json_path:
        payload = {
            "backend": harness.backend,
            "obedience": args.obedience,
            "cases": len(results),
            "summary": summary,
            "results": [
                {
                    "id": r.case.id,
                    "label": r.case.label,
                    "technique": r.case.technique,
                    "payload": r.case.payload,
                    "kind": r.case.kind,
                    "evades_patterns": r.case.evades_patterns,
                    "scores": r.scores,
                    "suppression": r.suppression,
                }
                for r in results
            ],
        }
        with open(args.json_path, "w") as fh:
            json.dump(payload, fh, indent=2)
        print(f"\nWrote {args.json_path}")


if __name__ == "__main__":
    main()
