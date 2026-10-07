from functools import lru_cache
from typing import List

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Secure Email Gateway"
    app_version: str = "1.0.0"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # Database
    database_url: str = Field(
        default="mysql+aiomysql://root@localhost:3306/seg_db",
        alias="DATABASE_URL",
    )

    # JWT
    jwt_secret: str = Field(default="change-me-in-production", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_access_expire_minutes: int = Field(default=30, alias="JWT_EXPIRE")
    jwt_refresh_expire_days: int = Field(default=7, alias="JWT_REFRESH_EXPIRE_DAYS")

    # Google OAuth / Gmail
    google_client_id: str = Field(default="", alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(default="", alias="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str = Field(
        default="http://localhost:8000/auth/google/callback",
        alias="GOOGLE_REDIRECT_URI",
    )

    # Microsoft OAuth
    microsoft_client_id: str = Field(default="", alias="MICROSOFT_CLIENT_ID")
    microsoft_client_secret: str = Field(default="", alias="MICROSOFT_CLIENT_SECRET")
    microsoft_redirect_uri: str = Field(
        default="http://localhost:8000/auth/microsoft/callback",
        alias="MICROSOFT_REDIRECT_URI",
    )

    # DKIM. Verifying a signature here needs the message exactly as it arrived,
    # which Gmail serves as a second request per message. Disable to halve the
    # API calls per fetch and fall back to the receiving server's reported
    # verdict, which a message from an untrusted source can assert for itself.
    dkim_verify_enabled: bool = Field(default=True, alias="DKIM_VERIFY_ENABLED")

    # Differential probe. Scores a second rendering of the body — the one an
    # ordinary classifier ingests — so the concealed half's effect on the verdict
    # can be measured. Costs one extra model call per message that conceals text,
    # and nothing for the messages that do not.
    differential_probe_enabled: bool = Field(
        default=True, alias="DIFFERENTIAL_PROBE_ENABLED"
    )

    # Audience analysis. Asks who concealed text was written for — a reader, a
    # mail client, or the system judging the message. Covers the case the probe
    # cannot: a payload in an already-clean message moves no verdict, so there is
    # no effect to measure. One extra model call per message that conceals text.
    audience_analysis_enabled: bool = Field(
        default=True, alias="AUDIENCE_ANALYSIS_ENABLED"
    )

    # Encryption for stored mailbox credentials. A refresh token is durable
    # full-mailbox access that survives a password change, which makes this
    # database a more valuable target than any message it protects. With no key
    # set the columns pass through unchanged and startup says so — refusing to
    # start would break every existing install on upgrade.
    #
    #   python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'
    token_encryption_key: str = Field(default="", alias="TOKEN_ENCRYPTION_KEY")

    # Gmail push notifications. Polling leaves a judged-dangerous message live
    # in the inbox for up to one interval; a watch closes that to a round trip.
    # Requires a Pub/Sub topic whose publisher is gmail-api-push@system
    # .gserviceaccount.com and a push subscription pointing at
    # POST {api_prefix}/gmail/push. Without a public URL for that endpoint this
    # stays off and the fallback sweep below is the only path.
    gmail_push_enabled: bool = Field(default=False, alias="GMAIL_PUSH_ENABLED")
    gmail_pubsub_topic: str = Field(default="", alias="GMAIL_PUBSUB_TOPIC")
    # The service account Pub/Sub signs push requests as, and the audience it
    # signs them for. Both are checked before a notification is acted on: the
    # endpoint is public, so anything unverified is an attacker's way to make
    # the gateway fetch on demand.
    gmail_push_service_account: str = Field(
        default="", alias="GMAIL_PUSH_SERVICE_ACCOUNT"
    )
    gmail_push_audience: str = Field(default="", alias="GMAIL_PUSH_AUDIENCE")

    # The fallback sweep. It is a safety net, not the primary path: it catches
    # what a dropped notification or a lapsed watch would otherwise lose. The
    # interval was hardcoded at 300s, which made the exposure window a constant
    # nobody could tune per deployment.
    scheduler_enabled: bool = Field(default=True, alias="SCHEDULER_ENABLED")
    scheduler_interval_seconds: int = Field(
        default=300, alias="SCHEDULER_INTERVAL_SECONDS"
    )
    # Raised from 10. With a cursor the sweep fetches what actually arrived, so
    # this is a ceiling on a burst rather than a window that silently drops mail.
    scheduler_max_results: int = Field(default=100, alias="SCHEDULER_MAX_RESULTS")
    # Gmail expires a watch after seven days and recommends renewing daily.
    watch_renew_interval_seconds: int = Field(
        default=86400, alias="WATCH_RENEW_INTERVAL_SECONDS"
    )

    # Password reset. The token is a short-lived JWT bound to the password hash
    # it was minted against, so using it invalidates it — single use without a
    # table to keep spent tokens in.
    password_reset_expire_minutes: int = Field(
        default=30, alias="PASSWORD_RESET_EXPIRE_MINUTES"
    )
    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")

    # SMTP. Delivers the reset link. With no host configured the link is written
    # to the log instead, so a local install can complete a reset without a mail
    # server — never do that where the log is not the operator's alone.
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from: str = Field(default="no-reply@localhost", alias="SMTP_FROM")
    smtp_starttls: bool = Field(default=True, alias="SMTP_STARTTLS")

    # Redis (optional, architecture ready)
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    redis_enabled: bool = Field(default=False, alias="REDIS_ENABLED")

    # CORS
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"],
        alias="CORS_ORIGINS",
    )

    # Rate limiting (ready)
    rate_limit_enabled: bool = Field(default=False, alias="RATE_LIMIT_ENABLED")
    rate_limit_per_minute: int = Field(default=60, alias="RATE_LIMIT_PER_MINUTE")


@lru_cache
def get_settings() -> Settings:
    return Settings()
