# Secure Email Gateway — Backend API

Production-ready REST API for phishing prevention and email security analysis.

## Tech Stack

- **Python 3.13+** · **FastAPI** · **Uvicorn**
- **PostgreSQL** · **SQLAlchemy 2.0** · **Pydantic V2**
- **JWT Authentication** · **bcrypt**
- **Gmail API** (OAuth2, mock fallback for MVP)

## Features

- JWT login / refresh tokens with role-based access (admin, user)
- Password reset by emailed link. The token is short-lived, carries its own token
  type so it cannot authenticate a session, and is bound to the password hash it
  was minted against — so spending it retires it, as does issuing a newer one,
  without a table of spent tokens. The request endpoint answers identically for
  an address with no account, since anything that varies with it is a test for
  who holds one. With `SMTP_HOST` unset the link is logged rather than sent,
  which suits a local install and nowhere else
- Gmail email retrieval (mock data when OAuth not configured)
- Email parsing (headers, body, URLs, attachments)
- Header analysis (SPF, DKIM, DMARC, sender anomalies)
  - **DKIM is verified locally** against the signing domain's published key, so
    the verdict does not depend on trusting the message's own headers
  - SPF and DMARC are read from the receiving server's `Authentication-Results`.
    Neither can be performed after delivery: SPF validates the connecting IP at
    the moment of delivery, and DMARC is a policy decision layered on top of it
- URL analysis (shorteners, typosquatting, blacklists)
- Attachment analysis (dangerous extensions, macros, archives)
- AI analysis placeholder (heuristic mock, LLM-ready interface)
- Differential probe: the body is scored twice — once as the recipient renders it,
  once as an ordinary classifier ingests it — under an identical prompt. The
  difference is the measured effect of the concealed text, so a payload worded
  outside any pattern list is still caught by what it does. A drop toward "safe"
  forces quarantine; the probe's verdict can only raise a score, never lower one.
  Costs one extra model call per message that conceals text
  (`DIFFERENTIAL_PROBE_ENABLED=false` to disable)
- Audience analysis: asks the model who concealed text was written for — a
  reader, a mail client, or the system judging the message. Covers what the probe
  cannot, since a payload in an already-clean message moves no verdict and so has
  no measurable effect (`AUDIENCE_ANALYSIS_ENABLED=false` to disable)
- Campaign fingerprints: concealed fragments are identified by a normalised
  hash, so a payload that was quarantined before is recognised when it arrives
  from a fresh sending domain — the one thing an attacker cannot rotate, since
  the hidden text is the attack. The fingerprint survives shredding, whitespace,
  case and span-splitting; only fragments from quarantined messages count, since
  ordinary bulk mail repeats footers and preheaders constantly
- Risk engine combining analysers as independent evidence (`1 - Π(1 - eᵢ)`)
  rather than a weighted mean, so an analyser that finds nothing leaves the score
  where it was instead of averaging it down
- Quarantine service (DB status; Gmail move ready)
- Dashboard statistics API
- Swagger / OpenAPI documentation

## Quick Start

### With Docker (recommended)

```bash
cd server
cp .env.example .env
docker compose up --build
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

### Local Development

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Start PostgreSQL locally, then:
uvicorn main:app --reload --port 8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login (JWT) |
| POST | `/api/v1/auth/refresh` | Refresh token |
| GET | `/api/v1/auth/me` | Current user |
| PUT | `/api/v1/auth/me` | Update name / password |
| POST | `/api/v1/auth/forgot-password` | Mail a reset link |
| POST | `/api/v1/auth/reset-password` | Spend the link, set a new password |
| GET | `/api/v1/auth/{google,microsoft}/login` | Begin OAuth |
| GET | `/api/v1/auth/{google,microsoft}/callback` | OAuth redirect |
| POST | `/api/v1/auth/{google,microsoft}` | OAuth code exchange (SPA) |
| GET | `/api/v1/emails` | List emails |
| GET | `/api/v1/emails/{id}` | Email detail |
| POST | `/api/v1/emails/fetch` | Fetch from Gmail |
| POST | `/api/v1/scan/email/{id}` | Scan single email |
| POST | `/api/v1/scan/all` | Scan all pending |
| GET | `/api/v1/scan/result/{id}` | Get scan result |
| GET | `/api/v1/dashboard` | Dashboard stats |
| POST | `/api/v1/gmail/push` | Pub/Sub mailbox notification (Google only; verified) |
| GET | `/health` | Health check |

## Example Flow

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"securepass123"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"securepass123"}'

# Fetch mock emails
curl -X POST http://localhost:8000/api/v1/emails/fetch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"mailbox":"inbox","max_results":5}'

# Scan all
curl -X POST http://localhost:8000/api/v1/scan/all \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"max_emails":10}'

# Dashboard
curl http://localhost:8000/api/v1/dashboard \
  -H "Authorization: Bearer <token>"
```

## Project Structure

```
server/
├── app/
│   ├── api/           # REST route handlers
│   ├── core/          # Config, security, logging
│   ├── database/      # SQLAlchemy models & session
│   ├── models/        # Model re-exports
│   ├── schemas/       # Pydantic request/response models
│   ├── services/      # Business logic layer
│   ├── repositories/  # Data access layer
│   ├── utils/         # Parsers, validators, helpers
│   └── middleware/    # Exception handlers
├── tests/
│   ├── unit/
│   └── integration/
├── main.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

## Environment Variables

See `.env.example` for all configuration options.

## Testing

```bash
pytest          # 228 tests
```

## How mail reaches the scanner

Two triggers, one pipeline. A message is scored identically however it arrived —
same analysers, same risk engine, same thresholds — because both triggers call
`MailboxSyncService.sync_user` and only differ in what wakes it.

**Push** (`POST /api/v1/gmail/push`) is the primary path when configured. Gmail
publishes to a Pub/Sub topic the moment the inbox changes, so the gap between
arrival and verdict is a round trip rather than a poll interval. That gap is the
window in which a message judged dangerous is live in the inbox and one click is
all the attack needs, which is the reason to prefer push over a timer.

The endpoint is reachable from the internet by necessity, so it verifies before
it acts: the request must carry an OIDC token Google signed for the configured
audience, and the signing service account must be the configured one. With
either value unset it refuses every notification rather than accepting
unverified ones — the alternative is an open trigger that makes the gateway
fetch on demand for any address a caller names. A verified notification always
answers 200, including one it cannot process, because Pub/Sub redelivers
anything else forever.

**The sweep** is the fallback, and the only path when push is off. It catches
what a dropped notification or a lapsed watch would lose, and renews the
watches — Gmail expires one after seven days and stops notifying without
saying so.

Synchronisation is incremental either way. `users.gmail_history_id` is a cursor
that advances only after the fetched messages have been scanned, so a crash
mid-scan re-fetches rather than skips. When a cursor falls outside Gmail's
history window — roughly a week, so a long outage — the sync reports that it
resynchronised instead of quietly fetching nothing, because mail behind that
window is not recoverable by this path.

See `.env.example` for the Pub/Sub topic, subscription and IAM setup. Push
cannot be enabled without a public HTTPS endpoint.

## The credentials this gateway holds

The system stores Google and Microsoft refresh tokens for every connected user.
A refresh token is durable, full-mailbox access that survives the user changing
their password, so this database is a higher-value target than any message it
protects. The tokens were stored as plain text in columns beside the email
address they belong to.

`THREAT_MODEL.md` covers the recipient, the classifier's input channel, the
pipeline's trust in its own components and the analyst's screen. It does not
cover the gateway as a credential store, and "Out of scope" does not exclude it.

Those columns are now an `EncryptedToken` type (`app/core/crypto.py`), so every
read and write goes through encryption whatever the calling code does — plain
columns plus the intention to be careful is what produced plaintext refresh
tokens in the first place.

What it buys, stated precisely: protection against a database read that is not
also a read of the application's configuration — a stolen dump, a backup on the
wrong disk, a misconfigured replica, a `SELECT *` through an injection. It does
**not** protect against an attacker who has the running host, because the key
must be readable by the process that uses it. Changing that needs a KMS or an
HSM, which is a deployment decision rather than a code one.

Set `TOKEN_ENCRYPTION_KEY` to turn it on. With no key the columns pass through
unchanged and startup logs a warning — refusing to start would break every
existing install on upgrade, and generating a key automatically would make the
tokens unrecoverable on the next restart. Tokens written before the key was set
stay readable and are re-stored encrypted the next time anything writes them,
which the token refresh does routinely.

Two things this does not address, both deployment rather than code:

- `DATABASE_URL` defaults to MySQL `root` with no password. With the above in
  the same database, that is the softest target in the system. The application
  should have its own user with rights on its own schema.
- Key custody. Stored beside the ciphertext it protects nothing, and losing it
  means every user must reconnect their mailbox.

## Who the sender is pretending to be

SPF, DKIM and DMARC answer whether a message was authorised by the domain it
claims, and that is exactly what business email compromise passes: a correctly
signed message from a domain the attacker genuinely controls, soliciting a
payment in a colleague's name. The threat model concedes the point — a message
from an authenticated, compromised colleague passes every authentication check
here, correctly.

`impersonation_analysis.py` reads the relationship instead, from the Email rows
already scanned rather than a table of its own:

- **First contact** — this mailbox has never had mail from this address.
- **Display-name impersonation** — a name this mailbox knows, arriving from an
  address it does not.
- **Lookalike address** — within two edits of a known correspondent's address,
  which covers the substitutions that work on a human eye (`biling` for
  `billing`) without pulling in genuinely different addresses at the same
  company.

The restraint is the harder half, and it is where this kind of detector usually
fails. **First contact scores nothing on its own.** Most legitimate mail is a
first contact — receipts, newsletters, a new supplier, a recruiter — so treating
an unfamiliar sender as suspicious would fire on ordinary mail all day. It is
recorded for an analyst and reaches the score only alongside a request worth
inventing a sender for. The signals that do score alone are the ones with no
innocent reading: a name this mailbox knows, from an address it does not.

A name has to have been seen at least twice before imitating it counts, since
one prior message is as likely to be the attacker's own earlier attempt.
Senders the gateway condemned are excluded from the contact list entirely —
otherwise the first attack from an address would be the thing that legitimised
every later impersonation of it.

The real limitation is depth: history reaches back only as far as this gateway
has been watching, so a genuinely established correspondent looks new to a fresh
install. That is the main reason first contact is not scored by itself.

## Revisiting delivered mail

Delivery-time scoring is one decision made with whatever evidence existed at
that instant, and the evidence keeps arriving. A message scored safe at nine in
the morning used to stay safe for good — even when the identical concealed
payload was quarantined at eleven arriving from a different domain. Campaign
analysis only looked backward, asking whether an arriving payload had been
condemned before; a payload condemned now had no way to reach the mail already
delivered carrying it.

A condemning verdict now triggers a pass over delivered mail sharing that
payload's fingerprints. What makes it work is ordering: the pass runs after the
sighting is stored, so campaign analysis finds the verdict just recorded where
on the first scan there was nothing to find. The messages are therefore pulled
because the pipeline scores them dangerous on the evidence now available, not
because a verdict was copied across from a sibling — a rescan that still scores
safe leaves the message where it is.

`Email.remediated_at` records that a message was delivered first and pulled back
later, which is the only measure of whether revisiting delivered mail catches
anything. A pull the mailbox refuses is counted apart from one it applied, for
the same reason `Email.enforced` exists: a verdict that could not be enforced is
not a message that was removed.

The pass does not cascade — the rescans it drives carry the fingerprints already
being handled — and it is bounded to one user's mail and to fingerprints already
stored. Its one real limit is that a retroactive rescan rebuilds the parse from
the stored row, and attachments are not persisted there, so a message re-judged
this way is scored without attachment analysis. Concealed text, headers and URLs
all survive in the row and are scored normally.

## MVP Limitations

The following are **not integrated** in v1 but have clean interfaces ready:

- VirusTotal · ClamAV · Google Safe Browsing
- Redis caching · Celery (the sweep and the push handler run in-process)
- LLM / ML models (AI service uses heuristics)
- Live Gmail API (uses mock emails when OAuth not configured)

## License

MIT
