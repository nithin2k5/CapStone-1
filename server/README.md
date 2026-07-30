# Secure Email Gateway — Backend API

Production-ready REST API for phishing prevention and email security analysis.

## Tech Stack

- **Python 3.13+** · **FastAPI** · **Uvicorn**
- **PostgreSQL** · **SQLAlchemy 2.0** · **Pydantic V2**
- **JWT Authentication** · **bcrypt**
- **Gmail API** (OAuth2, mock fallback for MVP)

## Features

- JWT login / refresh tokens with role-based access (admin, user)
- Gmail email retrieval (mock data when OAuth not configured)
- Email parsing (headers, body, URLs, attachments)
- Header analysis (SPF, DKIM, DMARC, sender anomalies)
- URL analysis (shorteners, typosquatting, blacklists)
- Attachment analysis (dangerous extensions, macros, archives)
- AI analysis placeholder (heuristic mock, LLM-ready interface)
- Risk engine with weighted scoring
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
| GET | `/api/v1/emails` | List emails |
| GET | `/api/v1/emails/{id}` | Email detail |
| POST | `/api/v1/emails/fetch` | Fetch from Gmail |
| POST | `/api/v1/scan/email/{id}` | Scan single email |
| POST | `/api/v1/scan/all` | Scan all pending |
| GET | `/api/v1/scan/result/{id}` | Get scan result |
| GET | `/api/v1/dashboard` | Dashboard stats |
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
pytest tests/ -v
```

## MVP Limitations

The following are **not integrated** in v1 but have clean interfaces ready:

- VirusTotal · ClamAV · Google Safe Browsing
- Redis caching · Celery background tasks
- LLM / ML models (AI service uses heuristics)
- Live Gmail API (uses mock emails when OAuth not configured)

## License

MIT
