from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenType, UserRole, decode_token
from app.database.database import get_db
from app.database.models import User
from app.repositories.email_repository import EmailRepository
from app.services.ai_analysis import AIAnalysisService
from app.services.differential_probe import DifferentialProbeService
from app.services.attachment_analysis import AttachmentAnalysisService
from app.services.dkim_verification import DKIMVerificationService
from app.services.gmail_service import GmailService
from app.services.header_analysis import HeaderAnalysisService
from app.services.perceptual_analysis import PerceptualAnalysisService
from app.services.quarantine_service import QuarantineService
from app.services.risk_engine import RiskEngine
from app.services.scan_service import ScanService
from app.services.url_analysis import URLAnalysisService

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = decode_token(credentials.credentials)
    if not token or token.type != TokenType.ACCESS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    repo = EmailRepository(db)
    user = await repo.get_user(UUID(token.sub))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def require_role(*roles: UserRole):
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return role_checker


def get_gmail_service() -> GmailService:
    return GmailService()


def get_scan_service() -> ScanService:
    risk_engine = RiskEngine()
    ai_service = AIAnalysisService()
    return ScanService(
        header_service=HeaderAnalysisService(),
        url_service=URLAnalysisService(),
        attachment_service=AttachmentAnalysisService(),
        ai_service=ai_service,
        perceptual_service=PerceptualAnalysisService(),
        # The probe compares two verdicts from one model, so it takes the same
        # instance the first pass used.
        probe_service=DifferentialProbeService(ai_service),
        dkim_service=DKIMVerificationService(),
        risk_engine=risk_engine,
        quarantine_service=QuarantineService(risk_engine),
    )
