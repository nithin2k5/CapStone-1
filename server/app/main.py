from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, dashboard, emails, gmail_push, scan
from app.api.settings import router as settings_router
from app.core.config import get_settings
from app.core.logging import RequestLoggingMiddleware, get_logger, setup_logging
from app.database.database import init_db
from app.middleware.error_handler import register_exception_handlers


from app.core.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    _report_credential_protection()
    await init_db()
    start_scheduler()
    yield
    stop_scheduler()


def _report_credential_protection() -> None:
    """
    Say at startup whether stored mailbox credentials are encrypted.

    Pass-through is the default so an upgrade cannot break an existing install,
    which means the only thing standing between that default and a database full
    of plaintext refresh tokens is somebody noticing. This is the notice.
    """
    from app.core.crypto import encryption_available

    log = get_logger("startup")
    if encryption_available():
        log.info("Stored mailbox credentials are encrypted at rest.")
    else:
        log.warning(
            "TOKEN_ENCRYPTION_KEY is not set: OAuth access and refresh tokens "
            "are stored in plain text. A refresh token is durable full-mailbox "
            "access, so this database is a higher-value target than the mail it "
            "protects. See .env.example to generate a key."
        )


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Secure Email Gateway API for phishing prevention. "
            "Scans emails, analyzes headers, URLs, attachments, and calculates risk scores."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)

    register_exception_handlers(app)

    api_prefix = settings.api_prefix
    app.include_router(auth.router, prefix=api_prefix)
    app.include_router(auth.router)  # Support direct calls like http://localhost:8000/auth/google/callback
    app.include_router(emails.router, prefix=api_prefix)
    app.include_router(scan.router, prefix=api_prefix)
    app.include_router(gmail_push.router, prefix=api_prefix)
    app.include_router(dashboard.router, prefix=api_prefix)
    app.include_router(settings_router, prefix=api_prefix)

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "healthy", "version": settings.app_version}

    return app


app = create_app()
