"""
Revisit mail that was already delivered.

A verdict used to be permanent. A message scored SAFE at nine in the morning
was never reconsidered, even though the identical concealed payload might be
quarantined at eleven arriving from a different domain — the gateway recorded
that fingerprint as condemned and left the message already in the inbox
untouched. Campaign analysis only ever looked backward: it asked whether an
arriving payload had been condemned before, never whether a payload being
condemned now had already been let through.

That asymmetry is the gap this closes. Delivery-time scoring is a single
decision made with whatever evidence existed at that instant, and the evidence
keeps arriving. Treating the verdict as revisable turns the exposure window from
something to be narrowed into something that can be undone.

The work is deliberately bounded: fingerprints already stored, messages
belonging to the same user, and a full rescan rather than a copied verdict —
so a message is pulled back because the pipeline now scores it dangerous, not
because a sibling was.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.database.models import EmailStatus
from app.repositories.payload_repository import PayloadSightingRepository

logger = get_logger("remediation")


@dataclass
class RemediationOutcome:
    considered: int = 0
    rescanned: int = 0
    pulled: int = 0
    # Messages that were re-judged dangerous but whose mailbox refused the move.
    # Counted separately: a pull the provider declined leaves the user exposed,
    # and reporting it as a success would be the same mistake as reporting an
    # unenforced block as a block.
    unenforced: int = 0
    email_ids: list[UUID] = field(default_factory=list)


class RemediationService:
    """
    Re-evaluate delivered mail that a new verdict casts doubt on.

    The scan service is injected rather than constructed because this is called
    from inside a scan: taking the caller's instance keeps one pipeline, and
    building another here would risk the retroactive pass scoring differently
    from the pass that triggered it.
    """

    def __init__(self, scan_service):
        self.scan_service = scan_service

    async def remediate_payload(
        self,
        db: AsyncSession,
        user_id: UUID,
        fingerprints: list[str],
        triggering_email_id: UUID | None = None,
    ) -> RemediationOutcome:
        """
        Rescan delivered messages carrying any of these fingerprints.

        Called after a scan has condemned a payload, with that payload's
        fingerprints. The rescan is a full one, and it reaches a different
        verdict than the first pass did for a specific reason: the sighting that
        condemns this fingerprint is now stored, so campaign analysis finds it
        where before there was nothing to find. The message is pulled because
        the pipeline scores it dangerous on the evidence now available.
        """
        outcome = RemediationOutcome()
        if not fingerprints:
            return outcome

        repo = PayloadSightingRepository(db)
        siblings = await repo.delivered_siblings(
            fingerprints, user_id, exclude_email_id=triggering_email_id
        )
        outcome.considered = len(siblings)
        if not siblings:
            return outcome

        logger.info(
            "Payload condemned; re-evaluating %d delivered message(s) for user=%s",
            len(siblings),
            user_id,
        )

        for email in siblings:
            previous = email.status
            try:
                # remediate=False: this rescan must not start a pass of its own.
                # The fingerprints are the same ones already being handled, so a
                # cascade would revisit the same set repeatedly to no effect.
                await self.scan_service.scan_email(db, email, remediate=False)
            except Exception as e:
                logger.error(
                    "Re-evaluation failed for delivered email %s: %s",
                    email.id,
                    e,
                    exc_info=True,
                )
                continue

            outcome.rescanned += 1

            if email.status == previous:
                # Re-judged and still safe. Not a failure: the payload being
                # condemned elsewhere is evidence, not proof, and a message that
                # survives the rescan should stay where it is.
                continue

            if email.status in (EmailStatus.QUARANTINED, EmailStatus.BLOCKED):
                email.remediated_at = datetime.now(timezone.utc)
                outcome.email_ids.append(email.id)
                if email.enforced:
                    outcome.pulled += 1
                    logger.warning(
                        "Delivered email %s pulled back as %s on later evidence",
                        email.id,
                        email.status.value,
                    )
                else:
                    outcome.unenforced += 1
                    logger.error(
                        "Delivered email %s was re-judged %s but the mailbox did "
                        "not apply it — the message is still in the inbox",
                        email.id,
                        email.status.value,
                    )

        logger.info(
            "Remediation finished: considered=%d rescanned=%d pulled=%d unenforced=%d",
            outcome.considered,
            outcome.rescanned,
            outcome.pulled,
            outcome.unenforced,
        )
        return outcome
