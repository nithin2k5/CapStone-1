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

Offline stand-in backend, 342 cases (6 clean twins, 336 attacked):

```
                                          flat      perceptual           probe
Phishing caught, no payload           0/3 (0%)        0/3 (0%)        0/3 (0%)
Phishing caught, with payload       0/168 (0%)    84/168 (50%)   159/168 (95%)
Benign carriers caught              0/168 (0%)    84/168 (50%)    84/168 (50%)
False positives (clean benign)        0/3 (0%)        0/3 (0%)        0/3 (0%)

Wording the pattern list matches    0/192 (0%)   168/192 (88%)   180/192 (94%)
Wording written to evade it         0/144 (0%)      0/144 (0%)    63/144 (44%)
```

The row that matters is the last one. Against payloads phrased outside the
pattern list, the pattern-based analyser catches **none** — by construction, since
those payloads contain no wording it looks for. The probe catches 44% of them,
without a single new pattern, because it measures what the text did to the
verdict rather than how it was phrased.

## Known finding: the risk engine under-scores unattacked phishing

No clean phishing message in the corpus reaches the quarantine threshold, so the
suppression rate reports `n/a` rather than a number. The worst case is
`credential-harvest`: SPF, DKIM and DMARC all hard-fail, the sender domain is
`acc0unts-micros0ft.com`, and the body solicits credentials — and it scores
**37/100**, comfortably below the 60 needed to quarantine.

That is not a benchmark artefact. It is the calibration weakness the risk engine
already documents in its own docstring — hand-chosen weights, never fitted — and
the benchmark simply gives it a number. A triple authentication failure is a
message the sending domain's own published policy asks the receiver to reject,
and a weighted average dilutes it to a third of the scale.

The suppression rate becomes measurable once that is fixed. It is deliberately
left reporting `n/a` until then, rather than dividing by the full attacked set:
that would print "0% suppression" for the undefended arm, which is the number an
undefended gateway would like to show.

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
