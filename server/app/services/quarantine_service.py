from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.logging import get_logger
from app.database.models import Email, EmailStatus, User
from app.services.risk_engine import RiskEngine
from app.services.gmail_service import GmailService
from app.services.microsoft_service import MicrosoftService

logger = get_logger("quarantine")


class QuarantineService:
    """
    Quarantine suspicious emails.
    """

    def __init__(
        self,
        risk_engine: RiskEngine | None = None,
        gmail_service: GmailService | None = None,
        microsoft_service: MicrosoftService | None = None,
    ):
        self.risk_engine = risk_engine or RiskEngine()
        self.gmail_service = gmail_service or GmailService()
        self.microsoft_service = microsoft_service or MicrosoftService()

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
        
    async def _provider_for(self, db: AsyncSession, user_id: UUID):
        """
        Resolve which mailbox provider holds this user's messages.

        A Microsoft-only user has no Google token, so keying off the Google token
        alone silently skipped the mailbox move for every Outlook account.
        """
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return None, None
        if user.google_access_token:
            return self.gmail_service, user.google_access_token
        if user.microsoft_access_token:
            return self.microsoft_service, user.microsoft_access_token
        return None, None

    async def _move(
        self,
        db: AsyncSession,
        user_id: UUID,
        gmail_message_id: str,
        action: str,
        add_labels: list[str],
        remove_labels: list[str],
    ) -> bool:
        service, token = await self._provider_for(db, user_id)
        if not token:
            logger.warning(
                "No mailbox access token found for user %s, cannot %s", user_id, action
            )
            return False

        return await service.modify_message_labels(
            access_token=token,
            message_id=gmail_message_id,
            add_labels=add_labels,
            remove_labels=remove_labels,
        )

    async def move_to_spam(self, db: AsyncSession, user_id: UUID, gmail_message_id: str) -> bool:
        return await self._move(
            db, user_id, gmail_message_id, "move to spam",
            add_labels=["SPAM"], remove_labels=["INBOX", "PendingScan"],
        )

    async def move_to_trash(self, db: AsyncSession, user_id: UUID, gmail_message_id: str) -> bool:
        return await self._move(
            db, user_id, gmail_message_id, "move to trash",
            add_labels=["TRASH"], remove_labels=["INBOX", "PendingScan"],
        )

    async def move_to_inbox(self, db: AsyncSession, user_id: UUID, gmail_message_id: str) -> bool:
        return await self._move(
            db, user_id, gmail_message_id, "move to inbox",
            add_labels=["INBOX"], remove_labels=["PendingScan"],
        )

    async def delete_email(self, user_id: UUID, gmail_message_id: str) -> bool:
        """Future Gmail integration: delete message completely."""
        logger.info(
            "Gmail hard delete not implemented (user=%s, msg=%s)",
            user_id,
            gmail_message_id,
        )
        return False
