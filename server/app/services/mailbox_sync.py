"""
Bring one mailbox up to date and scan what arrived.

The gateway had a single trigger: a sweep every five minutes that re-read the
newest ten messages. That made the exposure window — the time a message judged
dangerous spends live in the inbox, where one click is all the attacker needs —
a property of the poll interval rather than of the mail.

Two things change here. Synchronisation is incremental, resuming from a stored
history cursor instead of re-reading the newest N, so a restart resumes and a
burst is not silently truncated. And the same work is reachable from a push
notification, so arrival rather than the clock decides when scanning happens.

Both triggers land in `sync_user`. A message must be scored the same way however
it was reached, so there is one implementation and the triggers only differ in
what wakes it.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.database.models import EmailStatus, User
from app.repositories.email_repository import EmailRepository
from app.services.gmail_service import GmailMessage, GmailService
from app.services.mailbox_tokens import MailboxTokens, MailboxUnavailable
from app.services.scan_service import ScanService

logger = get_logger("mailbox_sync")


@dataclass
class SyncOutcome:
    fetched: int = 0
    scanned: int = 0
    # Set when the stored cursor had aged out of Gmail's history window and the
    # sync fell back to reading the newest messages. Mail behind that window is
    # not recoverable, so this is reported rather than inferred from counts.
    resynchronised: bool = False
    history_id: str | None = None
    findings: list[str] = field(default_factory=list)


class MailboxSyncService:
    def __init__(
        self,
        gmail_service: GmailService | None = None,
        scan_service: ScanService | None = None,
    ):
        self.gmail_service = gmail_service or GmailService()
        self.scan_service = scan_service or ScanService()
        self.tokens = MailboxTokens(self.gmail_service)

    # ------------------------------------------------------------------
    # Watch registration
    # ------------------------------------------------------------------

    async def ensure_watch(self, db: AsyncSession, user: User) -> bool:
        """
        Register or renew this user's Gmail watch.

        A watch lapses after seven days and stops notifying without saying so,
        which would hand the gateway back to its fallback interval while every
        log line still looked healthy. Renewal is therefore unconditional once
        the expiry is inside the renewal window, and the expiry Gmail returns is
        stored rather than computed.
        """
        settings = get_settings()
        if not (settings.gmail_push_enabled and settings.gmail_pubsub_topic):
            return False
        if not user.google_access_token:
            return False

        renew_at = datetime.now(timezone.utc) + timedelta(
            seconds=settings.watch_renew_interval_seconds
        )
        if user.gmail_watch_expires_at and user.gmail_watch_expires_at > renew_at:
            return True

        try:
            result = await self.tokens.google(
                db,
                user,
                lambda token: self.gmail_service.watch(token, settings.gmail_pubsub_topic),
            )
        except MailboxUnavailable as e:
            logger.warning("Cannot register watch for user=%s: %s", user.id, e)
            return False
        if not result:
            return False

        # Gmail reports the expiry in milliseconds since the epoch.
        expiration = result.get("expiration")
        if expiration:
            user.gmail_watch_expires_at = datetime.fromtimestamp(
                int(expiration) / 1000, tz=timezone.utc
            )
        # The watch response carries the cursor to start from. Only take it if
        # there is no cursor yet: overwriting a live one would skip whatever
        # arrived between the last sync and this renewal.
        if not user.gmail_history_id and result.get("historyId"):
            user.gmail_history_id = str(result["historyId"])

        db.add(user)
        logger.info(
            "Gmail watch active for user=%s until %s",
            user.id,
            user.gmail_watch_expires_at,
        )
        return True

    # ------------------------------------------------------------------
    # Synchronisation
    # ------------------------------------------------------------------

    async def sync_user(
        self,
        db: AsyncSession,
        user: User,
        reason: str = "poll",
    ) -> SyncOutcome:
        """Fetch whatever this mailbox has gained since the stored cursor, and scan it."""
        if not user.google_access_token:
            return SyncOutcome(findings=["no google access token"])

        try:
            return await self._sync(db, user, reason)
        except MailboxUnavailable as e:
            # Logged at error: a mailbox the gateway can no longer read is one
            # receiving mail nobody is scanning.
            logger.error("Cannot sync mailbox for user=%s: %s", user.id, e)
            return SyncOutcome(findings=[str(e)])

    async def _sync(self, db: AsyncSession, user: User, reason: str) -> SyncOutcome:
        settings = get_settings()
        outcome = SyncOutcome()

        if user.gmail_history_id:
            cursor = user.gmail_history_id
            messages, new_history_id, stale = await self.tokens.google(
                db, user, lambda token: self.gmail_service.fetch_history(token, cursor)
            )
            if stale:
                outcome.resynchronised = True
                logger.warning(
                    "Cursor for user=%s aged out of Gmail's history window; "
                    "falling back to the newest %d messages. Mail older than "
                    "that is not recoverable by this path.",
                    user.id,
                    settings.scheduler_max_results,
                )
                messages = await self._fetch_newest(user, db, settings)
                new_history_id = await self._current_history_id(db, user)
        else:
            # First sync for this mailbox. Read the newest messages and establish
            # a cursor, so every sync after this one is incremental.
            messages = await self._fetch_newest(user, db, settings)
            new_history_id = await self._current_history_id(db, user)

        outcome.fetched = len(messages)
        outcome.scanned = await self.scan_messages(db, user, messages)

        # The cursor advances only after the scanning above returned. Advancing
        # first would mean a crash mid-scan skipped the messages it had not
        # reached yet — they would be behind the cursor and never fetched again.
        if new_history_id:
            user.gmail_history_id = new_history_id
            db.add(user)
        outcome.history_id = new_history_id

        logger.info(
            "Sync (%s) user=%s fetched=%d scanned=%d cursor=%s",
            reason,
            user.id,
            outcome.fetched,
            outcome.scanned,
            new_history_id,
        )
        return outcome

    async def _fetch_newest(self, user: User, db: AsyncSession, settings) -> list[GmailMessage]:
        try:
            return await self.tokens.google(
                db,
                user,
                lambda token: self.gmail_service.fetch_messages(
                    user,
                    token,
                    mailbox="inbox",
                    max_results=settings.scheduler_max_results,
                    db=db,
                ),
            )
        except ValueError as e:
            logger.warning("Cannot fetch for user=%s: %s", user.id, e)
            return []

    async def _current_history_id(self, db: AsyncSession, user: User) -> str | None:
        return await self.tokens.google(db, user, self.gmail_service.current_history_id)

    async def scan_messages(
        self, db: AsyncSession, user: User, messages: list[GmailMessage]
    ) -> int:
        """
        Persist and score each message.

        One pipeline for every trigger: same analysers, same risk engine, same
        quarantine thresholds. The provider parse is passed through because
        attachments are not persisted on the Email row, so reconstructing from
        the database alone would score an attachment-bearing message as though
        it had none.
        """
        repo = EmailRepository(db)
        scanned = 0

        for msg in messages:
            email_record, _ = await repo.create_from_gmail(user.id, msg)

            # Already scored. Re-scoring on every sync would undo an analyst's
            # release and burn a model call per message per sweep.
            if email_record.status != EmailStatus.PENDING:
                continue

            scan = await self.scan_service.scan_email(db, email_record, msg.parsed)
            logger.info(
                "Email %s scored %.2f (%s) -> %s",
                msg.message_id,
                scan.final_score,
                scan.risk_level.value,
                email_record.status.value,
            )
            scanned += 1

        if scanned:
            await db.commit()
        return scanned

    # ------------------------------------------------------------------
    # Lookup used by the push webhook
    # ------------------------------------------------------------------

    async def user_for_address(self, db: AsyncSession, email_address: str) -> User | None:
        """
        Resolve the notification's mailbox to a user.

        A notification names an address, not a user id, and an address that does
        not correspond to a connected mailbox is not an error — it is a request
        the gateway should decline to act on.
        """
        result = await db.execute(
            select(User).where(
                User.email == email_address,
                User.google_access_token.isnot(None),
            )
        )
        return result.scalar_one_or_none()
