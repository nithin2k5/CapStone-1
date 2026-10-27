import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.logging import get_logger
from app.core.config import get_settings
from app.core.security import (
    TokenType,
    UserRole,
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    hash_password,
    password_fingerprint,
    verify_password,
)
from app.database.database import get_db
from app.database.models import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    MessageResponse,
    OAuthTokenRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdateRequest,
)
from app.services.mail_service import MailService
from app.services.mailbox_tokens import expiry_from

logger = get_logger("auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)) -> User:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.USER,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    logger.info("User registered: %s", user.email)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    logger.info("User logged in: %s", user.email)
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id, user.role),
        user_id=user.id,
        user_email=user.email,
        user_name=user.name,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    token_data = decode_token(payload.refresh_token)
    if not token_data or token_data.type != TokenType.REFRESH:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    result = await db.execute(select(User).where(User.id == UUID(token_data.sub)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id, user.role),
        user_id=user.id,
        user_email=user.email,
        user_name=user.name,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    if payload.name is not None:
        current_user.name = payload.name
    if payload.password is not None:
        current_user.hashed_password = hash_password(payload.password)
    
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


# The same answer whether or not the address is registered. Anything that
# varies with it — a 404, a slower path, a different wording — turns this
# endpoint into a test for whether someone holds an account here.
_RESET_REQUESTED = (
    "If that address has an account, a reset link is on its way."
)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    mail: MailService = Depends(MailService),
) -> MessageResponse:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user:
        token = create_password_reset_token(user.id, user.role, user.hashed_password)
        settings = get_settings()
        reset_url = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
        await mail.send_password_reset(user.email, reset_url)
    else:
        logger.info("Password reset requested for unknown address")

    return MessageResponse(message=_RESET_REQUESTED)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="This reset link is invalid or has expired",
    )

    token_data = decode_token(payload.token)
    if not token_data or token_data.type != TokenType.RESET:
        raise invalid

    try:
        user_id = UUID(token_data.sub)
    except ValueError:
        raise invalid

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise invalid

    # The token names the hash it was minted against. A reset replaces that
    # hash, so a token that has already been spent — or one issued before a
    # later request — no longer matches and is refused here.
    if token_data.fpr != password_fingerprint(user.hashed_password):
        raise invalid

    user.hashed_password = hash_password(payload.password)
    db.add(user)
    await db.flush()

    logger.info("Password reset completed for %s", user.email)
    return MessageResponse(message="Password updated. You can sign in now.")


@router.get("/google/login", summary="Initiate Google OAuth login")
async def google_login(state: str = "default_state"):
    from app.services.gmail_service import GmailService

    service = GmailService()
    url = service.get_oauth_url(state=state)
    return {"url": url}


async def _process_google_code(
    code: str, redirect_uri: str | None, db: AsyncSession
) -> TokenResponse:
    from app.services.gmail_service import GmailScopeMissing, GmailService

    service = GmailService()
    tokens = await service.exchange_code(code, redirect_uri=redirect_uri)
    if "access_token" not in tokens:
        logger.error("Google token exchange error: %s", tokens)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to exchange OAuth code: {tokens.get('error', 'unknown error')}",
        )

    # Refused rather than stored: an account without Gmail access signs in to
    # a dashboard that can neither fetch nor quarantine anything, and the
    # failure would only surface later as an unrelated-looking fetch error.
    if not GmailService.grants_mailbox_access(tokens.get("scope")):
        logger.warning("Google sign-in refused: grant lacks gmail.modify")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=GmailScopeMissing.MESSAGE,
        )

    access_token = tokens["access_token"]
    refresh_token = tokens.get("refresh_token")
    user_info = await service.get_user_info(access_token)
    email = user_info.get("email")
    name = user_info.get("name", "Google User")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google profile did not contain an email address",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            name=name,
            email=email,
            hashed_password=hash_password(f"sso_{uuid.uuid4().hex}"),
            role=UserRole.USER,
            google_access_token=access_token,
            google_refresh_token=refresh_token,
            google_token_expires_at=expiry_from(tokens),
        )
        db.add(user)
    else:
        user.google_access_token = access_token
        user.google_token_expires_at = expiry_from(tokens)
        if refresh_token:
            user.google_refresh_token = refresh_token
        db.add(user)

    await db.flush()
    await db.refresh(user)
    logger.info("User authenticated via Google: %s", user.email)

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id, user.role),
        user_id=user.id,
        user_email=user.email,
        user_name=user.name,
    )


@router.get("/google/callback", response_model=TokenResponse, summary="Google OAuth redirect callback")
async def google_callback(
    code: str, state: str | None = None, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    return await _process_google_code(code, None, db)


@router.post("/google", response_model=TokenResponse, summary="Google OAuth SPA code exchange")
async def google_post_auth(
    payload: OAuthTokenRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    return await _process_google_code(payload.code, payload.redirect_uri, db)

@router.get("/microsoft/login", summary="Initiate Microsoft OAuth login")
async def microsoft_login(state: str = "default_state"):
    from app.services.microsoft_service import MicrosoftService

    service = MicrosoftService()
    url = service.get_oauth_url(state=state)
    return {"url": url}

async def _process_microsoft_code(
    code: str, redirect_uri: str | None, db: AsyncSession
) -> TokenResponse:
    from app.services.microsoft_service import MicrosoftService

    service = MicrosoftService()
    tokens = await service.exchange_code(code, redirect_uri=redirect_uri)
    if "access_token" not in tokens:
        logger.error("Microsoft token exchange error: %s", tokens)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to exchange OAuth code: {tokens.get('error', 'unknown error')}",
        )

    access_token = tokens["access_token"]
    refresh_token = tokens.get("refresh_token")
    user_info = await service.get_user_info(access_token)
    email = user_info.get("email")
    name = user_info.get("name", "Microsoft User")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Microsoft profile did not contain an email address",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            name=name,
            email=email,
            hashed_password=hash_password(f"sso_{uuid.uuid4().hex}"),
            role=UserRole.USER,
            microsoft_access_token=access_token,
            microsoft_refresh_token=refresh_token,
            microsoft_token_expires_at=expiry_from(tokens),
        )
        db.add(user)
    else:
        user.microsoft_access_token = access_token
        user.microsoft_token_expires_at = expiry_from(tokens)
        if refresh_token:
            user.microsoft_refresh_token = refresh_token
        db.add(user)

    await db.flush()
    await db.refresh(user)
    logger.info("User authenticated via Microsoft: %s", user.email)

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id, user.role),
        user_id=user.id,
        user_email=user.email,
        user_name=user.name,
    )

@router.get("/microsoft/callback", response_model=TokenResponse, summary="Microsoft OAuth redirect callback")
async def microsoft_callback(
    code: str, state: str | None = None, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    return await _process_microsoft_code(code, None, db)

@router.post("/microsoft", response_model=TokenResponse, summary="Microsoft OAuth SPA code exchange")
async def microsoft_post_auth(
    payload: OAuthTokenRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    return await _process_microsoft_code(payload.code, payload.redirect_uri, db)
