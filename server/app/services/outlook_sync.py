"""
Bring one Outlook mailbox up to date and scan what arrived.

Outlook mail used to be scanned only when the user pressed fetch: the sweep and
the push endpoint knew only Gmail. This is the Outlook counterpart of
MailboxSyncService, resuming from a Graph delta link the way the Gmail path
resumes from a history cursor, and scoring through the same scan_messages so a
message is judged identically whichever provider delivered it.
"""

import asyncio
import secrets
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.database.models import User
from app.repositories.email_repository import EmailRepository
from app.services.gmail_service import GmailMessage
from app.services.mailbox_sync import MailboxSyncService, SyncOutcome
from app.services.mailbox_tokens import MailboxTokens, MailboxUnavailable
from app.services.microsoft_service import MicrosoftService
from app.services.scan_service import ScanService

logger = get_logger("outlook_sync")

# Graph caps how long a mail subscription may live. Two days stays well inside
# the cap, and renewing once less than a day remains gives the sweep many
# chances to succeed before a subscription lapses — a lapsed one stops
# notifying without saying so, the same failure as a lapsed Gmail watch.
SUBSCRIPTION_LIFETIME = timedelta(days=2)
RENEW_WITHIN = timedelta(days=1)

# The sweep and a push notification can reach the same mailbox at once. Both
# would read the same delta link and scan the same messages, so syncs of one
# mailbox take turns. Per process, which is enough: the API runs one worker.
_locks: defaultdict[str, asyncio.Lock] = defaultdict(asyncio.Lock)


@asynccontextmanager
async def _mailbox_lock(user_id):
    async with _locks[str(user_id)]:
        yield


class OutlookSyncService:
    def __init__(
        self,
        microsoft_service: MicrosoftService | None = None,
        scan_service: ScanService | None = None,
    ):
        self.microsoft_service = microsoft_service or MicrosoftService()
        self.tokens = MailboxTokens(microsoft_service=self.microsoft_service)
        self._scanner = MailboxSyncService(scan_service=scan_service or ScanService())

    async def ensure_subscription(self, db: AsyncSession, user: User) -> bool:
        """Create or renew this mailbox's Graph subscription for new-mail notifications."""
        settings = get_settings()
        if not (settings.microsoft_push_enabled and settings.microsoft_notification_url):
            return False
        if not user.microsoft_access_token:
            return False

        now = datetime.now(timezone.utc)
        expires_at = user.microsoft_subscription_expires_at
        if expires_at is not None and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if user.microsoft_subscription_id and expires_at and expires_at - now > RENEW_WITHIN:
            return True

        new_expiry = now + SUBSCRIPTION_LIFETIME
        try:
            if user.microsoft_subscription_id:
                subscription_id = user.microsoft_subscription_id
                renewed = await self.tokens.microsoft(
                    db,
                    user,
                    lambda token: self.microsoft_service.renew_subscription(
                        token, subscription_id, new_expiry
                    ),
                )
                if renewed:
                    user.microsoft_subscription_expires_at = new_expiry
                    db.add(user)
                    return True
                # Gone, or refused: create a replacement. A stale subscription
                # that is still alive keeps notifying under its old id, which
                # no longer matches a user, so its notifications are ignored.

            client_state = secrets.token_urlsafe(32)
            created = await self.tokens.microsoft(
                db,
                user,
                lambda token: self.microsoft_service.create_subscription(
                    token, settings.microsoft_notification_url, client_state, new_expiry
                ),
            )
        except MailboxUnavailable as e:
            logger.warning("Cannot maintain Outlook subscription for user=%s: %s", user.id, e)
            return False

        if not created or not created.get("id"):
            return False

        user.microsoft_subscription_id = created["id"]
        user.microsoft_client_state = client_state
        user.microsoft_subscription_expires_at = new_expiry
        db.add(user)
        logger.info(
            "Outlook subscription active for user=%s until %s", user.id, new_expiry
        )
        return True

    async def sync_user(
        self, db: AsyncSession, user: User, reason: str = "poll"
    ) -> SyncOutcome:
        """Fetch whatever this mailbox has gained since the stored delta link, and scan it."""
        if not user.microsoft_access_token:
            return SyncOutcome(findings=["no microsoft access token"])

        async with _mailbox_lock(user.id):
            try:
                return await self._sync(db, user, reason)
            except MailboxUnavailable as e:
                logger.error("Cannot sync Outlook mailbox for user=%s: %s", user.id, e)
                return SyncOutcome(findings=[str(e)])

    async def _sync(self, db: AsyncSession, user: User, reason: str) -> SyncOutcome:
        outcome = SyncOutcome()

        if user.microsoft_delta_link:
            link = user.microsoft_delta_link
            ids, new_link, stale = await self.tokens.microsoft(
                db, user, lambda token: self.microsoft_service.delta(token, link)
            )
            if stale:
                outcome.resynchronised = True
                new_link, messages = await self._start_over(db, user)
            else:
                messages = await self._fetch_unseen(db, user, ids)
        else:
            new_link, messages = await self._start_over(db, user)

        outcome.fetched = len(messages)
        outcome.scanned = await self._scanner.scan_messages(db, user, messages)

        # Advanced only after scanning returned, for the same reason as the Gmail
        # cursor: a crash mid-scan must not leave messages behind the link.
        if new_link:
            user.microsoft_delta_link = new_link
            db.add(user)
        outcome.history_id = new_link

        logger.info(
            "Outlook sync (%s) user=%s fetched=%d scanned=%d",
            reason,
            user.id,
            outcome.fetched,
            outcome.scanned,
        )
        return outcome

    async def _start_over(
        self, db: AsyncSession, user: User
    ) -> tuple[str | None, list[GmailMessage]]:
        """
        Establish a delta link, then read the newest messages.

        In that order: anything arriving after the link was taken is reported by
        the next delta, and anything arriving before it is among the newest. The
        overlap is harmless, because messages already stored are not scanned
        twice. The ids the walk returns are the whole inbox and are not scanned;
        a first sync covers the newest messages, as the Gmail path does.
        """
        _, link, _ = await self.tokens.microsoft(
            db, user, lambda token: self.microsoft_service.delta(token, None)
        )
        max_results = get_settings().scheduler_max_results
        messages = await self.tokens.microsoft(
            db,
            user,
            lambda token: self.microsoft_service.fetch_messages(
                user, token, "inbox", max_results, db=db
            ),
        )
        return link, messages

    async def _fetch_unseen(
        self, db: AsyncSession, user: User, ids: list[str]
    ) -> list[GmailMessage]:
        """
        Fetch only the messages not stored yet.

        Delta reports a message again whenever it changes, including being marked
        read. Those are already stored and scored, and fetching their bodies on
        every sweep would spend a Graph call per message for nothing.
        """
        repo = EmailRepository(db)
        unseen = [
            message_id
            for message_id in ids
            if await repo.get_by_gmail_id(message_id, user.id) is None
        ]
        if not unseen:
            return []
        return await self.tokens.microsoft(
            db,
            user,
            lambda token: self.microsoft_service.fetch_messages_by_id(token, unseen),
        )
