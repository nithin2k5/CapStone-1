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

## Concealed fragment isolation

Enabled by `FRAGMENT_ISOLATION_ENABLED=true`. Runs only when the reconstructed
hidden-text variant reproducibly moved the verdict. Bounded deletion testing
removes groups of whitespace-delimited tokens; each candidate must preserve the
effect on two calls. The final candidate is checked twice against two fresh
visible-body controls, rejecting attribution if controls have drifted. Interacting
fragments can survive together. A source hash, character ranges, candidate scores,
trial hashes and call count are saved with the scan. Evidence is displayed as
escaped text, never executable markup.

At most 16 additional calls and 45 seconds. The result is a locally reduced
candidate, not a globally minimal attack or proof of intent. Exhaustion, failed
confirmation and model errors are explicit. It does not add another risk term
for evidence already counted by stability testing.

## Accessibility comparison

Enabled by `ACCESSIBILITY_ANALYSIS_ENABLED=true`. Compares estimated visible,
accessible and classifier-ingested text. Supports names from `aria-labelledby`,
`aria-label`, and image `alt`, with hidden ancestors and inline display/visibility
rules. Offscreen text can remain accessible. `aria-hidden` no longer incorrectly
removes visually present content from the main parser. Naming behavior follows
the [W3C accessible names guidance](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/).

Normal descriptive labels and different wording do not score. Conflicting
destinations/payment values, an accessible URL label disagreeing with a link's
target, or analyser-directed instructions request review at the quarantine floor.
The message is never rewritten and accessibility text is never stripped.

This is an explicitly labelled static approximation, not a browser accessibility
tree or a screen-reader execution. Stylesheets, full ARIA role semantics, image
OCR, and email-client-specific layout remain outside coverage. Inputs are capped
at 100000 HTML characters, 3000 nodes and 64 nesting levels; excerpts and findings
are bounded. No model calls or schema migration are needed.

## Sender evidence dependencies

The sender analyser records the exact earlier message IDs used to recognise an
address or detect impersonation. Eligible history is limited to 2000 earlier,
delivered messages in the same mailbox; the current message, future messages,
remediated messages and invalidated evidence are excluded. Arrival order uses
the database creation time with ID as a deterministic tie-breaker. Sender-supplied
Date headers cannot establish this order.

Edges are persisted in `sender_trust_dependencies`, a new table created by the
existing startup `Base.metadata.create_all` path. Existing installations must
restart the API with schema-creation privileges before scanning. Existing scans
have no dependency records until rescanned; no historical edges are invented.

When a message is condemned, the gateway snapshots its dependent messages,
invalidates their evidence, and rescans delivered descendants in arrival order.
The graph walk and rescan count are bounded to 100 messages per trigger. Immediate
edges encountered beyond the budget are still invalidated and cannot confer
trust. Further descendants beyond the traversal budget are not guaranteed to be
invalidated; the source scan explicitly reports truncation for follow-up review.
There is currently no background retry queue for overflow or failed rescans.

Rescans replace their dependency edges, record the triggering message and old/new
scores, and use savepoints to isolate failures. A dependent message can remain
safe on its own evidence. Mailbox removals and failed enforcement are reported
separately. Trust-triggered scans do not recursively launch more traversals;
campaign-triggered rescans can still invalidate sender trust. Stored attachments
are unavailable on these rescans, as with existing campaign remediation.

This is provenance for sender-history decisions, not verification that a sender
is trustworthy or detection of every compromised account. Supporting-message
links and reassessment outcomes appear in email details.
