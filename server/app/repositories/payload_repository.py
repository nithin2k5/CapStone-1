from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import PayloadSighting


class PayloadSightingRepository:
    """Storage for concealed-fragment fingerprints and the verdicts they carried."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def prior_sightings(
        self,
        fingerprints: list[str],
        user_id: UUID,
        exclude_email_id: UUID | None = None,
    ) -> list[PayloadSighting]:
        """
        Earlier messages carrying any of these fragments, quarantined ones only.

        A repeat is evidence because a verdict travels with it. Fragments that
        have only ever appeared in delivered mail are boilerplate as far as this
        is concerned — shared footers and preheaders repeat across senders all
        day, and treating repetition alone as suspicious would flag them.
        """
        if not fingerprints:
            return []

        query = select(PayloadSighting).where(
            PayloadSighting.fingerprint.in_(fingerprints),
            PayloadSighting.user_id == user_id,
            PayloadSighting.quarantined.is_(True),
        )
        if exclude_email_id is not None:
            query = query.where(PayloadSighting.email_id != exclude_email_id)

        result = await self.db.execute(query.order_by(PayloadSighting.seen_at))
        return list(result.scalars().all())

    async def record(self, sightings: list[PayloadSighting]) -> None:
        """
        Store this message's fragments.

        A rescan re-records what is already there, which the unique constraint
        rejects; that is not a scan failure, so it is absorbed rather than raised.
        """
        for sighting in sightings:
            try:
                self.db.add(sighting)
                await self.db.flush()
            except IntegrityError:
                await self.db.rollback()
