from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.security import UserRole


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: UUID | None = None
    user_email: EmailStr | None = None
    user_name: str | None = None


class OAuthTokenRequest(BaseModel):
    code: str
    redirect_uri: str | None = "postmessage"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime

class UserUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    password: str | None = Field(None, min_length=8, max_length=128)

