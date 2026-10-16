from datetime import datetime, timezone

from app.core.logging import get_logger
from app.database.models import EmailStatus
from app.repositories.trust_repository import TrustRepository

logger = get_logger("trust_reassessment")


class TrustReassessmentService:
    MAX_RESCANS = 100

    def __init__(self, scanner):
        self.scanner = scanner

    async def reassess(self, db, trigger):
        outcome = {"considered": 0, "rescanned": 0, "pulled": 0, "unenforced": 0,
                   "failed": 0, "truncated": False}
        emails, outcome["truncated"] = await TrustRepository(db).invalidate_descendants(
            trigger.user_id, trigger.id, self.MAX_RESCANS,
        )
        outcome["considered"] = len(emails)
        for email in emails:
            # Already condemned mail is not automatically released by a trust
            # change. It can still have descendants in the snapshot above.
            if email.status not in (EmailStatus.SAFE, EmailStatus.SCANNED):
                continue
            email_id = email.id
            previous_score = email.risk_score
            try:
                async with db.begin_nested():
                    scan = await self.scanner.scan_email(db, email, remediate=False, reassess_trust=False)
                    scan.findings = {**(scan.findings or {}), "trust_reassessment": {
                        "triggering_email_id": str(trigger.id),
                        "previous_score": previous_score, "new_score": scan.final_score,
                        "at": datetime.now(timezone.utc).isoformat(),
                        "enforced": email.enforced,
                    }}
                    if email.status in (EmailStatus.QUARANTINED, EmailStatus.BLOCKED):
                        email.remediated_at = datetime.now(timezone.utc)
                        outcome["pulled" if email.enforced else "unenforced"] += 1
                    await db.flush()
                outcome["rescanned"] += 1
            except Exception:
                outcome["failed"] += 1
                logger.exception("Trust reassessment failed for email %s", email_id)
        return outcome
