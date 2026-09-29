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
