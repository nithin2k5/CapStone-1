# Threat model

An email gateway has always defended one thing: the person reading the message.
Once a language model decides what gets quarantined, there is a second thing to
defend — **the verdict itself**. The classifier reads attacker-supplied text and
acts on what it reads, which makes it reachable by anyone who can send mail.

This document states what that means concretely: who the adversary is, what they
can reach, what stops them, and what does not.

## Assets

| Asset | Why it is worth attacking |
|---|---|
| The recipient's credentials, money, and machine | The classic goal. Phishing, fraud, malware. |
| **The gateway's verdict** | A message that talks its way to "safe" is delivered. One successful suppression is worth more to an attacker than a thousand messages that merely evade a keyword list, because it generalises to every message they send afterwards. |
| The analyst's screen | Findings are reviewed in a browser. Anything rendered there is rendered from attacker-controlled bytes. |

## Adversary

Assumed capabilities:

- Can send arbitrary MIME to the protected mailbox: any HTML, CSS, headers,
  attachments, encodings, Unicode.
- **Knows how the gateway works.** This repository is public. The adversary has
  read `perceptual_analysis.py`, knows exactly which wordings
  `INSTRUCTION_PATTERNS` matches, and will phrase payloads outside it. Any
  defence whose strength depends on the attacker not having read the source is
  not counted here as a defence.
- Can iterate: send, observe whether delivery happened, adjust.
- Can conceal text through any channel a mail client renders — CSS, colour,
  sizing, positioning, clipping, stylesheet classes, comments, attribute text,
  invisible codepoints, and combinations of these.

Assumed limits:

- No access to the gateway host, its database, its model provider, or the
  recipient's session.
- Cannot read the mailbox or the dashboard.
- Cannot observe the score a message received, only whether it was delivered.

## Attack surfaces, and what stands in front of each

### 1. The recipient

Classic phishing: spoofed identity, urgency, a credential-harvesting link, a
hostile attachment.

Controls: authentication results (`header_analysis.py`), with DKIM verified
locally against the signing domain's published key rather than trusting the
message's own claim about itself (`dkim_verification.py`); URL analysis
including punycode homograph decoding (`url_analysis.py`); attachment analysis
with real content hashes (`attachment_analysis.py`); model-based intent analysis
(`ai_analysis.py`).

### 2. The classifier's input channel

The message carries text aimed at the analyser rather than the reader, concealed
so the recipient never sees the discrepancy. This is the surface the project
exists for.

Controls, in order of how much an adversary's wording choices can weaken them:

1. **The visible text is what the model is shown.** Concealed text is split out
   before the model sees anything (`email_parser.py`, `ai_analysis.py`), so the
   payload's normal delivery path is closed before any detection is attempted.
2. **A trust boundary in the prompt.** Attacker-controlled fields sit inside a
   marked block whose identifier is regenerated per request, so a payload cannot
   close the block and continue outside it.
3. **Concealment is scored, not stripped** (`perceptual_analysis.py`). Volume,
   channel count, invisible codepoints, mixed-script words, links present only
   in hidden markup.
4. **Instruction-shaped wording is matched** — the weakest of these, because a
   pattern list is exactly what an adversary who has read the source will write
   around. The benchmark measures it catching 0% of payloads written as routine
   administrative notes.
5. **The effect is measured** (`differential_probe.py`). The body is scored
   twice, once as rendered and once as ingested, under an identical prompt. The
   gap is what the concealed text did to the verdict, which does not depend on
   its wording. A drop toward "safe" forces quarantine.
6. **Evidence floors** (`risk_engine.py`). Concealed instructions, a reported
   injection attempt, or a measured suppression each set a lower bound on the
   score that no other analyser's silence can dilute.

### 3. The pipeline's trust in its own components

An attacker does not have to defeat a detector if they can make it fail quietly.

- A failed model call used to be indistinguishable from a clean scan. It is now
  marked `degraded`, and the fallback keyword score is never presented as a model
  verdict.
- A malformed model response used to default a missing probability to 0.0 —
  the safest-looking possible outcome. It is now a validation failure.
- An analyser returning zero used to *lower* the final score, because the engine
  averaged. Evidence now combines rather than averaging, so silence from one
  analyser cannot argue down another's finding.
- The probe's own verdict comes from attacker-controlled text, so it is allowed
  to raise a score and never to lower one.

### 4. The analyst's screen

Findings are read in a browser, and concealed payload text is displayed there by
design — that is the point of the evidence panel.

- Concealed text reaches the UI as text, never as markup, and instruction-shaped
  spans are labelled as payloads so a reader does not mistake them for the
  system talking (`DivergencePanel.tsx`).
- The message body renders inside an iframe with an empty `sandbox`, the maximal
  restriction: no scripts, no same-origin access, no forms, no navigation of the
  parent (`SafeMessagePreview.tsx`). Script in the body is inert rather than
  filtered, which is the stronger guarantee — a sanitiser is a list of what
  someone thought of, and the adversary above is assumed to write around lists.
- A Content-Security-Policy inside that frame blocks every network fetch. Remote
  images in mail are tracking pixels: loading one while reviewing a quarantined
  message would tell the sender it reached a human and was opened. Data-URI
  images still render.
- Links render but do not navigate. The URLs worth acting on are listed
  separately, already scored.

This replaced a real exposure. The page previously wrote the raw body into the
dashboard's own document through `dangerouslySetInnerHTML`, under a label saying
"Sanitized" while nothing sanitised it. Measured in headless Chrome, a body
carrying `onerror` and `<svg onload>` handlers took over the host document under
the old path and is inert under the new one; the tracking pixel is fetched
without the CSP and blocked with it. (`innerHTML` does not execute `<script>`
tags — the live vector was handler attributes.)

## Out of scope

- In-transit interception: TLS is the mail transport's problem.
- Malware analysis. Attachments are scored on type, structure and hash — nothing
  is detonated, and no sandbox is claimed.
- Account compromise and insider senders. A message from a genuinely
  authenticated, genuinely compromised colleague passes every authentication
  check here, correctly.
- Volumetric abuse and mailbox policy. Rate limits, retention, DLP.
- SPF and DMARC re-evaluation. Neither can be performed after delivery — SPF
  validates the connecting IP at the moment of delivery — so both are read from
  the receiving server's `Authentication-Results`, and that header is trusted.
  Only DKIM survives delivery, which is why it is the one verified here.

## Residual risk

Measured, not asserted. Every figure below comes from `server/benchmarks`.

- **A payload with no measurable effect is not measured.** The probe scores what
  the concealed text *did* to the verdict. In a message whose visible half is
  already clean, arguing for "safe" changes nothing, so there is no gap to
  detect — benign-looking carriers are caught at 50%, entirely by the pattern
  list and the concealment volume.
- **Payloads outside the pattern list are still the strongest attack.** The probe
  takes detection of them from 35% to 48%. That is a large relative improvement
  and an incomplete defence.
- **Concealment in HTML comments gains nothing from the probe**, because the
  parser drops comments before either pass — the payload reaches neither, so
  there is no gap to measure.
- **The weights are hand-chosen, not fitted.** They are now interpretable one at
  a time (each analyser's reliability is its own ceiling), but fitting them needs
  labelled mail this project does not have.
- **One model, synthetic corpus.** Six base messages, one offline stand-in
  classifier that obeys payloads by construction. These demonstrate a mechanism;
  they are not population estimates.
- **Frame isolation is the browser's guarantee, not ours.** The preview's safety
  rests on `sandbox` and CSP being enforced. Adding `allow-scripts` or
  `allow-same-origin` to that frame later would silently undo it.

## Assumptions

- The receiving server's `Authentication-Results` header is honest. It is
  generated by infrastructure ahead of this gateway; a message that could forge
  it would have already defeated the mail system.
- The model provider is not an adversary.
- Mail reaches this gateway after delivery, through an authenticated API
  (Gmail, Microsoft Graph). This is a post-delivery analysis layer, not an MTA.
