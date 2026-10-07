from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Email, EmailStatus


class SenderHistoryRepository:
    """
    Who this mailbox has heard from before.

    Derived from the Email rows the gateway has already scanned rather than a
    table of its own. That keeps one source of truth and means history exists
    from the first sweep, at the cost of a real limitation: the history reaches
    back only as far as this gateway has been watching, so a genuinely
    established correspondent looks new to a fresh install. The analyser built
    on it is written to tolerate that — being unknown is never treated as
    evidence on its own.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def times_seen(self, user_id: UUID, address: str) -> int:
        """How many messages this mailbox has had from this exact address."""
        if not address:
            return 0
        result = await self.db.execute(
            select(func.count())
            .select_from(Email)
            .where(
                Email.user_id == user_id,
                func.lower(Email.sender).like(f"%{address.lower()}%"),
            )
        )
        return int(result.scalar() or 0)

    async def known_correspondents(
        self, user_id: UUID, limit: int = 500
    ) -> list[tuple[str, int]]:
        """
        Addresses this mailbox has received delivered mail from, and how often.

        Quarantined and blocked senders are excluded. A sender the gateway
        condemned is not a contact, and letting one into the contact list would
        make the first attack from an address the thing that legitimises every
        later impersonation of it.
        """
        result = await self.db.execute(
            select(Email.sender, func.count().label("seen"))
            .where(
                Email.user_id == user_id,
                Email.status.in_([EmailStatus.SAFE, EmailStatus.SCANNED]),
                Email.remediated_at.is_(None),
            )
            .group_by(Email.sender)
            .order_by(func.count().desc())
            .limit(limit)
        )
        return [(row[0] or "", int(row[1])) for row in result.all()]
