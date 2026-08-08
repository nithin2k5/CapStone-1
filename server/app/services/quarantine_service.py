from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.logging import get_logger
from app.database.models import Email, EmailStatus, User
from app.services.risk_engine import RiskEngine
from app.services.gmail_service import GmailService

logger = get_logger("quarantine")


class QuarantineService:
    """
    Quarantine suspicious emails.
    """

    def __init__(self, risk_engine: RiskEngine | None = None, gmail_service: GmailService | None = None):
        self.risk_engine = risk_engine or RiskEngine()
        self.gmail_service = gmail_service or GmailService()

    async def apply_quarantine(
        self,
        db: AsyncSession,
        email: Email,
        final_score: float,
    ) -> EmailStatus:
        if self.risk_engine.should_block(final_score):
            email.status = EmailStatus.BLOCKED
            logger.warning("Email %s BLOCKED (score=%.2f)", email.id, final_score)
            await self.move_to_trash(db, email.user_id, email.gmail_message_id)
        elif self.risk_engine.should_quarantine(final_score):
            email.status = EmailStatus.QUARANTINED
            logger.warning("Email %s QUARANTINED (score=%.2f)", email.id, final_score)
            await self.move_to_spam(db, email.user_id, email.gmail_message_id)
        else:
            email.status = EmailStatus.SAFE
            logger.info("Email %s marked SAFE (score=%.2f)", email.id, final_score)
            await self.move_to_inbox(db, email.user_id, email.gmail_message_id)

        email.risk_score = final_score
        await db.flush()
        return email.status
        
    async def _get_user_token(self, db: AsyncSession, user_id: UUID) -> str | None:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            return user.google_access_token
        return None

    async def move_to_spam(self, db: AsyncSession, user_id: UUID, gmail_message_id: str) -> bool:
        """Gmail integration: move message to spam folder."""
        token = await self._get_user_token(db, user_id)
        if not token:
            logger.warning("No Google access token found for user %s, cannot move to spam", user_id)
            return False
            
        return await self.gmail_service.modify_message_labels(
            access_token=token, 
            message_id=gmail_message_id, 
            add_labels=["SPAM"], 
            remove_labels=["INBOX", "PendingScan"]
        )

    async def move_to_trash(self, db: AsyncSession, user_id: UUID, gmail_message_id: str) -> bool:
        """Gmail integration: move message to trash."""
        token = await self._get_user_token(db, user_id)
        if not token:
            logger.warning("No Google access token found for user %s, cannot move to trash", user_id)
            return False
            
        return await self.gmail_service.modify_message_labels(
            access_token=token, 
            message_id=gmail_message_id, 
            add_labels=["TRASH"], 
            remove_labels=["INBOX", "PendingScan"]
        )

    async def move_to_inbox(self, db: AsyncSession, user_id: UUID, gmail_message_id: str) -> bool:
        """Gmail integration: move message to inbox (used for inline blocking)."""
        token = await self._get_user_token(db, user_id)
        if not token:
            logger.warning("No Google access token found for user %s, cannot move to inbox", user_id)
            return False
            
        return await self.gmail_service.modify_message_labels(
            access_token=token, 
            message_id=gmail_message_id, 
            add_labels=["INBOX"], 
            remove_labels=["PendingScan"]
        )

    async def delete_email(self, user_id: UUID, gmail_message_id: str) -> bool:
        """Future Gmail integration: delete message completely."""
        logger.info(
            "Gmail hard delete not implemented (user=%s, msg=%s)",
            user_id,
            gmail_message_id,
        )
        return False
