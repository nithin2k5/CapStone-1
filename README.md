# Secure Email Gateway

A post-delivery phishing gateway built on a premise the usual ones do not make:
**once a language model decides what gets quarantined, the model is part of the
attack surface.**

Every mail filter defends the person reading the message. This one also defends
its own verdict — against senders who write to the classifier instead of the
victim, hiding instructions in markup the recipient never renders.

## The claim, and the evidence for it

An email is two documents: the text a recipient renders, and the text a
classifier ingests. Ordinary gateways flatten the HTML and classify the result,
which discards the difference. This one keeps both and scores the gap.

Measured on a corpus of matched pairs — every attacked message has a twin whose
visible half is byte-identical and whose concealed half is absent:

```
                                          flat      perceptual           probe
Pairs flipped by the payload       49/112 (44%)      0/112 (0%)      0/112 (0%)
Phishing caught, with payload      63/168 (38%)   143/168 (85%)   165/168 (98%)
False positives (benign concealment)  0/15 (0%)       0/15 (0%)       0/15 (0%)

Wording the pattern list matches   36/192 (19%)   176/192 (92%)   180/192 (94%)
Wording written to evade it        27/144 (19%)    51/144 (35%)    69/144 (48%)
```

Text the recipient never saw argued an ordinary gateway out of a verdict it had
already reached **44% of the time**. With divergence analysis watching, none of
those pairs flipped — and none of the fifteen decoys carrying ordinary
concealment (preheaders, tracking pixels, collapsed footnotes) was flagged.

Full method, limitations and the case against over-reading these numbers:
[`server/benchmarks/README.md`](server/benchmarks/README.md).

## How it works

Five analysers score each message independently:

| Analyser | Asks |
|---|---|
| Header | Does the message come from where it claims? DKIM is verified locally against the signing domain's key, not read from the message's own claim. |
| URL | Shorteners, typosquats, punycode homographs, blacklists. |
| Attachment | Dangerous types, macros, archives, real content hashes. |
| Content | A model's reading of intent and social engineering — over the **visible** text only. |
| **Perceptual** | Is the message shown to the reader the message handed to the model? |

Then the **differential probe** scores the body a second time, over the text an
ordinary classifier would ingest, under an identical prompt. The body is the only
variable, so the gap between the two verdicts is the measured effect of the
concealed text — which catches payloads worded outside any pattern list.

Two further checks cover what the probe cannot. A payload inside a message whose
visible half is already clean moves no verdict, so there is no gap to measure:
the **audience** classifier asks instead who the concealed text was written for —
a reader, a mail client, or the system judging the message — and only the third
answer counts as evidence, since legitimate mail conceals machine-directed text
constantly. The **campaign** check asks whether this concealed half has arrived
here before, because rotating the sending domain resets the header analyser, the
URL reputation and the sender history at once while leaving the payload
untouched; fingerprints are taken after normalisation, so the mutations that
defeat pattern matching do not mint a new identity. Only fragments from
quarantined messages count — bulk mail repeats footers across senders all day.

The risk engine combines these as independent evidence, `1 - Π(1 - eᵢ)`, rather
than averaging them: an analyser that finds nothing leaves the score where it
was instead of diluting one that found something conclusive. Three findings —
concealed instructions, a reported injection attempt, a measured suppression —
also set a floor no other analyser's silence can pull below.

## Running it

Four additional research features are integrated into scanning and email details:
repeated verdict stability experiments, concealed-fragment isolation,
accessibility comparison, and sender-evidence dependency reassessment. See
[`server/RESEARCH_FEATURES.md`](server/RESEARCH_FEATURES.md) for budgets, switches,
deployment requirements, and experimental limitations. The table above measures
the original differential-probe benchmark, not these additions.

```bash
./start-all.sh          # API on :8000, web on :3000
```

Or separately — see [`server/README.md`](server/README.md) for the API,
environment and Docker setup. The client is a Next.js app in `client/`.

```bash
cd server && pytest                    # 228 tests
cd server && python -m benchmarks.run  # the table above, offline, ~1s
```

## Layout

```
server/      FastAPI service — analysers, risk engine, scan pipeline
  app/services/    one analyser per file; differential_probe.py and
                   risk_engine.py are where the divergence work lives
  benchmarks/      the adversarial corpus and harness
client/      Next.js dashboard; components/security/ shows what a verdict is
             a claim about — DivergencePanel.tsx the rendered/analysed gap,
             AudienceVerdict.tsx and CampaignHistory.tsx the two questions
             the hidden text's wording cannot settle
```

## What this is not

[`THREAT_MODEL.md`](THREAT_MODEL.md) states the adversary, the surfaces, and
what is deliberately out of scope — no malware detonation, no in-transit
protection, no defence against a genuinely compromised sender — along with the
residual risks the benchmark measured rather than the ones optimism suggests.

The weights are hand-chosen rather than fitted, the benchmark corpus is
synthetic, and its model backend is a stand-in that obeys payloads by
construction. Those are stated plainly wherever a number is reported.

The audience classifier is the one component with no efficacy number at all: it
cannot be benchmarked against a stand-in model that would answer the audience
question with whatever it was written to answer, and the measurement against a
real model has not been taken. It has unit tests and a mechanism, and that is
all it has — see `server/benchmarks/README.md`.
