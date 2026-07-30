from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.database.models import Email, EmailStatus
from app.services.risk_engine import RiskEngine

logger = get_logger("quarantine")


class QuarantineService:
    """
    Quarantine suspicious emails.
    MVP: updates database status only.
    Future: move Gmail messages to spam/trash.
    """

    def __init__(self, risk_engine: RiskEngine | None = None):
        self.risk_engine = risk_engine or RiskEngine()

    async def apply_quarantine(
        self,
        db: AsyncSession,
        email: Email,
        final_score: float,
    ) -> EmailStatus:
        if self.risk_engine.should_block(final_score):
            email.status = EmailStatus.BLOCKED
            logger.warning("Email %s BLOCKED (score=%.2f)", email.id, final_score)
        elif self.risk_engine.should_quarantine(final_score):
            email.status = EmailStatus.QUARANTINED
            logger.warning("Email %s QUARANTINED (score=%.2f)", email.id, final_score)
        else:
            email.status = EmailStatus.SAFE
            logger.info("Email %s marked SAFE (score=%.2f)", email.id, final_score)

        email.risk_score = final_score
        await db.flush()
        return email.status

    async def move_to_spam(self, user_id: UUID, gmail_message_id: str) -> bool:
        """Future Gmail integration: move message to spam folder."""
        logger.info(
            "Gmail spam move not implemented (user=%s, msg=%s)",
            user_id,
            gmail_message_id,
        )
        return False

    async def delete_email(self, user_id: UUID, gmail_message_id: str) -> bool:
        """Future Gmail integration: delete message."""
        logger.info(
            "Gmail delete not implemented (user=%s, msg=%s)",
            user_id,
            gmail_message_id,
        )
        return False
