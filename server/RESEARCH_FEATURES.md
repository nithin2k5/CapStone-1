# Research features

These are experimental additions, not claims of world-first implementation or
proven detection accuracy. Unit tests use deterministic models; efficacy needs a
labelled corpus and real-model evaluation.

## Verdict stability

Enabled by `VERDICT_STABILITY_ENABLED=true`. After a healthy main LLM verdict,
messages containing at least 16 concealed characters are tested with three
identical visible-body controls and two repetitions of each variant: original
ingested text, visible text followed by concealed text, and that reconstruction
with hidden whitespace/invisible codepoints normalised. Duplicate bodies reuse
measurements. The visible body and prompt options stay fixed. These are text
ingestion experiments, not pixel-equivalent HTML rendering experiments.

Every variant repeat must lie at least `max(15, control range + 5)` points outside
the control envelope, in the same direction. A control spread of 15 or more
points makes attribution inconclusive. Either case sets a review floor at the
existing quarantine threshold; it cannot lower other risk evidence. This is a
review decision, not proof of malicious intent or a calibrated statistical test.

At most nine additional single-chunk model calls, 45 seconds total, and 6000
characters per experimental body. Larger bodies are explicitly skipped rather
than sampled. Failures retain partial evidence and report degradation. Findings
are persisted in the existing scan JSON and displayed in email details, so no
schema migration is needed. Existing differential-probe decisions remain active.
