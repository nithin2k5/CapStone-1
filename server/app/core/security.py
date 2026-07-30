from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Optional
from uuid import UUID

import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import get_settings


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


class TokenPayload(BaseModel):
    sub: str
    role: UserRole
    type: TokenType
    exp: datetime


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def _create_token(
    subject: UUID,
    role: UserRole,
    token_type: TokenType,
    expires_delta: timedelta,
) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + expires_delta
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role.value,
        "type": token_type.value,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(subject: UUID, role: UserRole) -> str:
    settings = get_settings()
    return _create_token(
        subject,
        role,
        TokenType.ACCESS,
        timedelta(minutes=settings.jwt_access_expire_minutes),
    )


def create_refresh_token(subject: UUID, role: UserRole) -> str:
    settings = get_settings()
    return _create_token(
        subject,
        role,
        TokenType.REFRESH,
        timedelta(days=settings.jwt_refresh_expire_days),
    )


def decode_token(token: str) -> Optional[TokenPayload]:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return TokenPayload(
            sub=payload["sub"],
            role=UserRole(payload["role"]),
            type=TokenType(payload["type"]),
            exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
    except (JWTError, KeyError, ValueError):
        return None
