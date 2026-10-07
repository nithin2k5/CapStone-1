"""
The fallback sweep, and watch upkeep.

This used to be the only way mail reached the scanner: every five minutes,
re-read the newest ten messages. Both numbers were hardcoded, which made the
exposure window — the time a message judged dangerous spends live in the inbox —
a constant of the source rather than a deployment decision, and made a burst
above ten messages per sweep invisible.

With push notifications carrying the primary path, this becomes a safety net
with two jobs: catch what a dropped notification or a lapsed watch would lose,
and keep the watches registered. It still works unaided — with push disabled it
is the only path, now cursor-based and configurable — because a deployment with
no public URL for the webhook has to have something.
"""

import asyncio

from sqlalchemy import select

from app.core.config import get_settings
from app.core.logging import get_logger
from app.database.database import AsyncSessionLocal
from app.database.models import User
from app.services.mailbox_sync import MailboxSyncService

logger = get_logger("scheduler")


async def _connected_users(db):
    result = await db.execute(select(User).where(User.google_access_token.isnot(None)))
    return result.scalars().all()


async def fetch_emails_job():
    """Synchronise every connected mailbox, and renew the watches that need it."""
    logger.info("Running scheduled mailbox sweep")
    sync = MailboxSyncService()
    try:
        async with AsyncSessionLocal() as db:
            users = await _connected_users(db)
            if not users:
                logger.info("No users with Google access tokens found in scheduler.")
                return

            for user in users:
                try:
                    # Before syncing, not after: a mailbox with no live watch is
                    # one this sweep is the only cover for, and the sooner that
                    # is repaired the smaller the window it leaves.
                    await sync.ensure_watch(db, user)
                    await sync.sync_user(db, user, reason="sweep")
                    await db.commit()
                except Exception as e:
                    # With the traceback suppressed, a programming error in this
                    # loop was indistinguishable from a provider timeout and the
                    # sweep looked like it was merely having a bad run.
                    logger.error(
                        "Failed to sync mailbox for user %s: %s",
                        user.id,
                        e,
                        exc_info=True,
                    )
                    await db.rollback()
    except Exception as e:
        logger.error("Error in scheduled fetch_emails_job: %s", e, exc_info=True)


async def run_scheduler():
    settings = get_settings()
    interval = settings.scheduler_interval_seconds
    mode = "fallback for push" if settings.gmail_push_enabled else "primary path"
    logger.info(
        "Background sweep started: every %ds, %s, up to %d messages per mailbox.",
        interval,
        mode,
        settings.scheduler_max_results,
    )
    while True:
        await fetch_emails_job()
        # Sleeping after the job makes the real cadence interval + sweep
        # duration. That is deliberate for a safety net — it cannot stack
        # overlapping sweeps on a slow provider — and is why the interval is
        # documented as a floor rather than a period.
        await asyncio.sleep(interval)


_scheduler_task = None


def start_scheduler():
    global _scheduler_task
    if not get_settings().scheduler_enabled:
        logger.info("Background sweep disabled by configuration.")
        return
    _scheduler_task = asyncio.create_task(run_scheduler())


def stop_scheduler():
    global _scheduler_task
    if _scheduler_task:
        _scheduler_task.cancel()
