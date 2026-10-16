from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.orm import selectinload

from app.database.models import Email, SenderTrustDependency


class TrustRepository:
    def __init__(self, db):
        self.db = db

    async def record(self, email, supporting_ids):
        await self.db.execute(
            delete(SenderTrustDependency).where(
                SenderTrustDependency.user_id == email.user_id,
                SenderTrustDependency.email_id == email.id,
            )
        )
        if supporting_ids:
            # Enforce scope again at the persistence boundary.
            result = await self.db.execute(
                select(Email.id).where(
                    Email.user_id == email.user_id,
                    Email.id != email.id,
                    Email.id.in_([UUID(value) for value in supporting_ids]),
                )
            )
            for support_id in result.scalars().all():
                self.db.add(
                    SenderTrustDependency(
                        user_id=email.user_id,
                        email_id=email.id,
                        supporting_email_id=support_id,
                    )
                )
        await self.db.flush()

    async def invalidate_descendants(self, user_id, root_id, limit=100):
        """Snapshot descendants before rescans replace edges. Bound fanout/work."""
        seen = {root_id}
        frontier = [root_id]
        descendants = []
        truncated = False
        while frontier:
            # All immediate edges become stale, including those beyond the scan
            # budget. Stale messages cannot supply reputation to a new scan.
            await self.db.execute(
                update(SenderTrustDependency)
                .where(
                    SenderTrustDependency.user_id == user_id,
                    SenderTrustDependency.supporting_email_id.in_(frontier),
                )
                .values(invalidated=True)
            )
            result = await self.db.execute(
                select(SenderTrustDependency.email_id)
                .where(
                    SenderTrustDependency.user_id == user_id,
                    SenderTrustDependency.supporting_email_id.in_(frontier),
                    SenderTrustDependency.email_id.not_in(seen),
                )
                .distinct()
                .order_by(SenderTrustDependency.email_id)
                .limit(limit - len(descendants) + 1)
            )
            candidates = list(result.scalars().all())
            remaining = limit - len(descendants)
            if len(candidates) > remaining:
                truncated = True
                candidates = candidates[:remaining]
            descendants.extend(candidates)
            seen.update(candidates)
            if truncated:
                break
            frontier = candidates
        if not descendants:
            return [], truncated
        result = await self.db.execute(
            select(Email)
            .where(
                Email.user_id == user_id,
                Email.id.in_(descendants),
            )
            .options(selectinload(Email.scan_result))
            .order_by(Email.created_at, Email.id)
        )
        return list(result.scalars().all()), truncated
