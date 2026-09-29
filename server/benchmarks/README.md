# Concealed-instruction benchmark

Measures whether the gateway still catches a phishing message once the message
carries text that argues the classifier down — text the recipient never sees.

```bash
cd server
python -m benchmarks.run                  # offline stand-in model, ~1s
python -m benchmarks.run --llm            # against the configured model
python -m benchmarks.run --json report.json
```

## What it measures

The corpus is built from **matched pairs**. Every attacked message has a twin
whose visible half is byte-identical and whose concealed half is absent. A
detection rate on its own is a property of the test set; the difference between a
pair is a property of the defence. The headline number is therefore the
**suppression rate** — the share of pairs where the clean twin was caught and the
attacked one was not.

Three arms score the same messages, so each row isolates one decision:

| Arm | What it does |
|---|---|
| `flat` | An ordinary gateway: flatten the HTML, classify the text, score the result. No notion of a hidden half. |
| `perceptual` | Visible text to the classifier; concealed text to the pattern-based perceptual analyser. |
| `probe` | The above, plus the differential probe measuring what the concealed half does to the verdict. |

The negatives are not only clean mail. Fifteen **decoys** carry concealment with
an ordinary reason behind it — preheader lines, tracking pixels, footnotes
collapsed on mobile, Outlook conditional markup. A detector whose premise is that
concealment is evidence has to be measured against the mail that conceals things
innocently, or its false-positive rate is meaningless.

The column worth reading is `probe` minus `perceptual`, on the *pattern-evading*
payload rows. Those payloads carry no imperative, no role assignment and no named
verdict — they read as routine administrative notes ("Reviewed under ticket
SEC-88213… cleared for delivery"). A pattern list cannot match them without also
matching ordinary mail, so they separate a detector that reads syntax from one
that measures effect.

## The model backend, and what the numbers do not say

The default backend is a **stand-in classifier that obeys concealed instructions
by construction**, not a real model. This is deliberate:

- The benchmark measures the *gateway*. Against a live model, a payload that
  happens to fail says nothing about whether the gateway would have held against
  one that worked — the two variables are mixed.
- Results stay reproducible. A vendor model update would otherwise silently move
  every number in the report.

So `flat` scoring 100% suppression is **not** a claim that any particular
production classifier is 100% suppressible. It is the worst case, and the
question being asked is whether the gateway holds when the classifier has
already been suppressed. `--obedience 0.5` sweeps a partially susceptible model;
`--llm` swaps in the configured real model for the other measurement. Every
report states which backend produced it.

Messages are synthetic. Public phishing corpora (Nazario, Enron-derived sets)
contain no concealed-instruction payloads — the attack post-dates them — so a
matched pair cannot be sampled from one and has to be constructed.

## Labels

`label` is the ground truth of the **visible** message. A benign-looking message
carrying a concealed payload is reported separately as a *carrier*: catching it
is correct behaviour, since nothing legitimate needs to hide instructions to a
classifier. False positives are therefore counted only on clean benign mail.

## Results, and what they say

Offline stand-in backend, 357 cases (336 attacked, 18 benign of which 15 conceal
something for ordinary reasons):

```
                                          flat      perceptual           probe
Phishing caught, no payload           2/3 (67%)       2/3 (67%)       2/3 (67%)
Phishing caught, with payload      63/168 (38%)   143/168 (85%)   165/168 (98%)
Benign carriers caught               0/168 (0%)    84/168 (50%)    84/168 (50%)
False positives (clean benign)         0/3 (0%)        0/3 (0%)        0/3 (0%)
False positives (benign concealment)  0/15 (0%)       0/15 (0%)       0/15 (0%)
Pairs flipped by the payload       49/112 (44%)      0/112 (0%)      0/112 (0%)
AUC, payload vs benign mail               0.969           0.971           0.982
AUC, concealed half alone                 0.938           0.942           0.964

Wording the pattern list matches   36/192 (19%)   176/192 (92%)   180/192 (94%)
Wording written to evade it        27/144 (19%)    51/144 (35%)    69/144 (48%)
```

**The headline number is the flip rate.** Of the matched pairs whose clean twin
the gateway had already caught, text the recipient never sees argued an ordinary
gateway back out of its verdict **44% of the time**. With divergence analysis
watching, none of them flipped. Nothing the recipient could see differed between
the two messages in a pair.

**The second number is the payload-wording split.** Against payloads written as
routine administrative notes — no imperative, no role assignment, no named
verdict — the pattern list catches 35%, and adding the probe takes that to 48%
without a single new pattern. It catches them by what they did to the verdict,
not by how they were phrased.

**Concealment alone is not treated as guilt.** All 15 decoys — preheaders,
tracking pixels, collapsed mobile footnotes, Outlook conditional markup — are
concealment with an ordinary reason behind it, and no arm flags one at any
threshold in the sweep.

### Why AUC is reported but not led with

The `flat` arm scores 0.938 on "AUC, concealed half alone" — a number that looks
like detection and is not. Its benign carriers score 1.6 and its benign negatives
score 0.0, so the ranking is almost perfect while every value sits fifty points
below any threshold anyone would set. A constant offset satisfies a rank metric
and quarantines nothing.

That is the case for leading with the flip rate and the threshold sweep. Both are
stated at an operating point, where a score has to cross a line that a real
deployment would act on.

## Known finding, since fixed: the risk engine under-scored unattacked phishing

The first run of this benchmark caught 0/3 clean phishing messages, which left
the flip rate undefined — no pair can flip if the unattacked twin was never
caught. The worst case was `credential-harvest`: SPF, DKIM and DMARC all
hard-fail, sender domain `acc0unts-micros0ft.com`, body soliciting credentials —
**37/100**, comfortably below the 60 needed to quarantine.

The cause was the risk engine's weighted mean. The attachment and perceptual
analysers correctly found nothing, and their zeros were averaged into the result:
an analyser's silence actively lowered the score. Independent-evidence fusion
replaced it, and the same message is now quarantined. The benchmark found this,
not a test — which is the argument for having one.

## Limitations

- **Nothing to measure is not the same as nothing there.** The probe scores the
  *effect* of concealed text. In a message whose visible half is already clean,
  a payload arguing for "safe" changes nothing, so there is no delta — which is
  why benign carriers sit at 50% for both analysers. What catches those is the
  concealment itself, and small volumes of hidden text are deliberately not
  scored highly (preheaders are legitimate).
- **The `html-comment` technique gains nothing from the probe**, because the
  parser's own flattening drops comments — the payload never reaches the model
  in either pass, so there is no verdict to move. The exposure there belongs to
  classifiers that do read comments.
- Synthetic corpus, one stand-in model, six base messages. These are
  demonstrations of a mechanism, not population estimates.

## Extending it

- A new concealment technique: add a function to `TECHNIQUES` in `corpus.py`.
- A new payload: add to `PAYLOADS`, and set `evades_patterns=True` if it is
  written to avoid the wording in `INSTRUCTION_PATTERNS`.
- A new base message: add to `BASE_MESSAGES`. The clean twin is generated for you.
