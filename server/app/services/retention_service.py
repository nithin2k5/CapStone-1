"""
Erase the content of delivered mail once its day is over.

Mail judged safe is delivered and needs nothing further from the gateway, so
its body, headers and detailed scan result are erased once a day. The row
itself stays, holding sender, recipient, subject, times and verdict, because
other checks are built from it:

- sender recognition learns known correspondents from delivered mail, and
  impersonation of a contact can only be detected against that list;
- the stored provider id stops a later sync from fetching and scanning the
  same message again.

What is lost: a message whose content is erased cannot be scanned again, so the
retroactive passes — pulling back delivered mail that carried a payload
condemned later, and reassessing mail whose sender trust is withdrawn — cover
only mail delivered on the current day. Those passes skip erased messages and
say so rather than rescanning an empty body.

The day boundary is the time the message reached the gateway, not its Date
header, which the sender writes. That time is stamped by the database's clock,
so "before today" is judged by the same clock: the database's CURRENT_DATE,
which makes the boundary midnight in the database's time zone.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.database.models import Email, EmailStatus, ScanResult

logger = get_logger("retention")

BATCH = 500


def fetch_window_start() -> datetime | None:
    """
    Where a read of the newest messages should start: midnight today.

    Mail from earlier days is erased by the retention pass once scanned, so
    pulling it in on a first sync or a Sync Now would spend model calls on mail
    nobody keeps. Local time on the gateway, the same clock the database stamps
    arrival with in a normal install. None when FETCH_TODAY_ONLY is off.
    """
    if not get_settings().fetch_today_only:
        return None
    return datetime.now().astimezone().replace(hour=0, minute=0, second=0, microsecond=0)


async def discard_delivered_before(db: AsyncSession, cutoff: Any = None) -> int:
    """
    Erase the content of every safe message that reached the gateway before `cutoff`.

    `cutoff` defaults to the start of the database's current day. Idempotent:
    erased messages are not selected again, so running it more often than daily
    only does work once a day has ended.
    """
    if cutoff is None:
        cutoff = func.current_date()
    discarded = 0
    now = datetime.now(timezone.utc)

    while True:
        result = await db.execute(
            select(Email.id)
            .where(
                Email.status == EmailStatus.SAFE,
                Email.discarded_at.is_(None),
                Email.created_at < cutoff,
            )
            .limit(BATCH)
        )
        ids = [row[0] for row in result.all()]
        if not ids:
            break

        await db.execute(delete(ScanResult).where(ScanResult.email_id.in_(ids)))
        await db.execute(
            update(Email)
            .where(Email.id.in_(ids))
            .values(body_text=None, body_html=None, raw_headers=None, discarded_at=now)
            .execution_options(synchronize_session=False)
        )
        # Committed per batch, so a large first run neither holds one long
        # transaction nor starts over from nothing if it is interrupted.
        await db.commit()
        discarded += len(ids)

    if discarded:
        logger.info("Erased the content of %d delivered message(s) from earlier days", discarded)
    return discarded
