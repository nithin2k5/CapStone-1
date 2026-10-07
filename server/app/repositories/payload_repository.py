from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.models import Email, EmailStatus, PayloadSighting


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

    async def delivered_siblings(
        self,
        fingerprints: list[str],
        user_id: UUID,
        exclude_email_id: UUID | None = None,
    ) -> list[Email]:
        """
        Messages still in the inbox that carry any of these fragments.

        The mirror of prior_sightings, which looks backward and asks whether a
        payload has been condemned before. This looks forward: the payload has
        just been condemned, so what was delivered carrying it is now mail the
        gateway has evidence against and has already let through.

        Only SAFE messages qualify. Anything quarantined or blocked has been
        acted on, and a PENDING one has not been scored yet and will be reached
        on its own.
        """
        if not fingerprints:
            return []

        query = (
            select(Email)
            .options(selectinload(Email.scan_result))
            .join(PayloadSighting, PayloadSighting.email_id == Email.id)
            .where(
                PayloadSighting.fingerprint.in_(fingerprints),
                PayloadSighting.user_id == user_id,
                Email.user_id == user_id,
                Email.status == EmailStatus.SAFE,
            )
            .distinct()
        )
        if exclude_email_id is not None:
            query = query.where(Email.id != exclude_email_id)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def record(self, sightings: list[PayloadSighting]) -> None:
        """
        Store this message's fragments, with the verdict they now carry.

        A rescan re-records what is already there. That used to be absorbed by
        catching the unique constraint, which left the stored verdict at
        whatever the first scan decided — so a message delivered as safe and
        later pulled back kept telling the next repeat it had been delivered.
        The existing row is updated instead, and the insert's own constraint
        failure is contained in a savepoint rather than rolling back the
        caller's transaction along with it.
        """
        for sighting in sightings:
            existing = await self.db.execute(
                select(PayloadSighting).where(
                    PayloadSighting.email_id == sighting.email_id,
                    PayloadSighting.fingerprint == sighting.fingerprint,
                )
            )
            row = existing.scalar_one_or_none()
            if row is not None:
                row.quarantined = sighting.quarantined
                continue

            try:
                async with self.db.begin_nested():
                    self.db.add(sighting)
            except IntegrityError:
                # Lost a race to another writer; the row exists, which is what
                # was wanted.
                pass
