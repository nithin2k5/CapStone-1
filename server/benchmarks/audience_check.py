"""
Measure the audience classifier against a real model.

The corpus benchmark cannot evidence this feature. Its stand-in model would have
to answer the audience question itself, and whatever answer it was written to
give is the answer the benchmark would then report — the result would be a
restatement of an assumption. So this asks the configured model directly, on the
two sets of text where being right matters:

  payloads  concealed text written for the evaluator. Expected "analyser".
  decoys    concealment with an ordinary reason behind it — preheaders, tracking
            pixels, mobile footnotes, Outlook conditionals. Expected anything but
            "analyser"; a false positive here is the expensive kind, because it
            fires on ordinary bulk mail.

    python -m benchmarks.audience_check

One model call per case, around a dozen in total.
"""

import argparse
import asyncio

from app.services.audience_analysis import ANALYSER, AudienceAnalysisService
from app.utils.email_parser import RenderedEmail
from benchmarks.corpus import DECOYS, PAYLOADS, TECHNIQUES, build_corpus


def _cases() -> list[tuple[str, str, str, str]]:
    """(kind, id, concealed text, expected) for one technique's worth of cases."""
    cases: list[tuple[str, str, str, str]] = []

    for payload in PAYLOADS:
        cases.append(
            (
                "payload",
                payload.id + (" (evades patterns)" if payload.evades_patterns else ""),
                payload.text,
                ANALYSER,
            )
        )

    # Decoys are markup, so they go through the parser to get the text a reader
    # never sees — the same string the service would be handed in production.
    from app.utils.email_parser import render_email

    for name, markup in DECOYS.items():
        rendered = render_email(f"<html><body><p>Your order shipped.</p>{markup}</body></html>")
        text = rendered.hidden_text.strip()
        if text:
            cases.append(("decoy", name, text, f"not {ANALYSER}"))

    return cases


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--concurrency", type=int, default=4, help="in-flight model calls"
    )
    parser.parse_args()

    service = AudienceAnalysisService(enabled=True)
    semaphore = asyncio.Semaphore(4)

    async def classify(text: str):
        async with semaphore:
            # The service takes a rendered email; only the concealed half is read.
            return await service.analyze(
                RenderedEmail(visible_text="", hidden_text=text, machine_text=text)
            )

    cases = _cases()
    results = await asyncio.gather(*(classify(text) for _, _, text, _ in cases))

    print(f"{'kind':8} {'case':36} {'expected':14} {'got':10} {'conf':>5}  ok")
    print("-" * 88)

    correct = {"payload": 0, "decoy": 0}
    total = {"payload": 0, "decoy": 0}
    degraded = 0

    for (kind, name, _, expected), result in zip(cases, results):
        total[kind] += 1
        if result.degraded:
            degraded += 1
        ok = (
            result.label == ANALYSER
            if expected == ANALYSER
            else result.ran and result.label != ANALYSER
        )
        correct[kind] += int(ok)
        print(
            f"{kind:8} {name[:36]:36} {expected:14} "
            f"{(result.label or '—'):10} {result.confidence:5.0f}  {'yes' if ok else 'NO'}"
        )

    print("-" * 88)
    for kind in ("payload", "decoy"):
        if total[kind]:
            print(
                f"{kind + 's':9} {correct[kind]}/{total[kind]} correct "
                f"({correct[kind] / total[kind]:.0%})"
            )
    if degraded:
        print(f"{degraded} call(s) failed and degraded")
    print(f"\nTechniques in the corpus: {len(TECHNIQUES)}; "
          f"cases classified here: {len(cases)} (one per payload and decoy)")
    print(f"Corpus size for the full benchmark: {len(build_corpus())} cases")


if __name__ == "__main__":
    asyncio.run(main())
