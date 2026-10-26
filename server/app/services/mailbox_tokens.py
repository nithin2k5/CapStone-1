"""
Keep a mailbox grant usable for as long as the user has not revoked it.

An OAuth access token lasts about an hour. Renewal used to live inside one
method — listing the newest Gmail messages — so it only happened when that path
ran: a first sync, an aged-out cursor, or the user pressing fetch. Every call
the gateway makes on its own after that (incremental history, the watch, the
quarantine move) presented the stored token, got a 401, logged it, and returned
nothing. The sweep kept running and kept looking healthy while scanning nothing,
about an hour after the user last opened the app.

Every mailbox call now goes through `MailboxTokens`, which renews a token
shortly before its recorded expiry and, failing that, once after the provider
rejects it. There is one place that knows how renewal works, so no call site can
forget it.
"""

from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta, timezone
from typing import Any, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger

logger = get_logger("mailbox_tokens")

T = TypeVar("T")

# Renew this long before the recorded expiry, so a token never lapses part way
# through a sync. A history fetch that loses its token half way through drops
# the messages it had not reached while the cursor still advances past them.
RENEW_MARGIN = timedelta(minutes=5)


class AccessTokenRejected(Exception):
    """The provider answered 401: the access token has expired or been revoked."""


class GrantRevoked(Exception):
    """The refresh token itself was refused. Only the user reconnecting fixes this."""


class MailboxUnavailable(Exception):
    """No usable token could be produced for this mailbox."""


def expiry_from(token_response: dict[str, Any]) -> datetime | None:
    """When an access token from a provider's token endpoint stops working."""
    try:
        seconds = int(token_response.get("expires_in"))
    except (TypeError, ValueError):
        return None
    return datetime.now(timezone.utc) + timedelta(seconds=seconds)


class _Provider:
    """Which User columns hold one provider's grant, and which service renews it."""

    def __init__(self, name: str, service: Any):
        self.name = name
        self.service = service
        self.access = f"{name}_access_token"
        self.refresh = f"{name}_refresh_token"
        self.expires = f"{name}_token_expires_at"


class MailboxTokens:
    def __init__(self, gmail_service: Any = None):
        if gmail_service is None:
            from app.services.gmail_service import GmailService

            gmail_service = GmailService()
        self._google = _Provider("google", gmail_service)

    async def google(
        self,
        db: AsyncSession | None,
        user: Any,
        call: Callable[[str], Awaitable[T]],
    ) -> T:
        """Run `call` with a working Google access token for `user`."""
        return await self._call(db, user, self._google, call)

    async def _call(
        self,
        db: AsyncSession | None,
        user: Any,
        provider: _Provider,
        call: Callable[[str], Awaitable[T]],
    ) -> T:
        token = getattr(user, provider.access, None)
        if not token:
            raise MailboxUnavailable(f"no {provider.name} access token")

        if self._expiring(user, provider):
            # A transient renewal failure falls back to the stored token, which
            # may still have a few minutes left. A revoked grant has been
            # cleared by now, and there is nothing left to try.
            token = await self._renew(db, user, provider) or getattr(
                user, provider.access, None
            )
            if not token:
                raise MailboxUnavailable(f"{provider.name} grant was revoked")

        try:
            return await call(token)
        except AccessTokenRejected:
            logger.info(
                "%s access token rejected for user=%s; renewing",
                provider.name,
                user.id,
            )
            token = await self._renew(db, user, provider)
            if not token:
                raise MailboxUnavailable(
                    f"{provider.name} access token expired and could not be renewed"
                )
            # A second rejection propagates: a token minted seconds ago being
            # refused is not something another renewal would fix.
            return await call(token)

    def _expiring(self, user: Any, provider: _Provider) -> bool:
        expires_at = getattr(user, provider.expires, None)
        if expires_at is None:
            # Unknown, as for grants stored before expiry was recorded. The 401
            # path covers these, and records an expiry the first time it renews.
            return False
        if expires_at.tzinfo is None:
            # SQLite hands timezone-aware columns back naive.
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return expires_at - RENEW_MARGIN <= datetime.now(timezone.utc)

    async def _renew(
        self, db: AsyncSession | None, user: Any, provider: _Provider
    ) -> str | None:
        refresh_token = getattr(user, provider.refresh, None)
        if not refresh_token:
            logger.error(
                "%s grant for user=%s has no refresh token; background scanning "
                "stops when the current access token expires. The user must "
                "reconnect the mailbox.",
                provider.name,
                user.id,
            )
            return None

        try:
            response = await provider.service.refresh_access_token(refresh_token)
        except GrantRevoked:
            # Clearing the grant takes the mailbox out of the sweep. Leaving it
            # would retry a dead credential every interval, forever.
            logger.error(
                "%s refresh token for user=%s was revoked or has expired; "
                "clearing the grant. The user must reconnect the mailbox.",
                provider.name,
                user.id,
            )
            setattr(user, provider.access, None)
            setattr(user, provider.refresh, None)
            setattr(user, provider.expires, None)
            if db is not None:
                db.add(user)
            return None

        token = (response or {}).get("access_token")
        if not token:
            # Transient: a network error or a provider outage. The grant is left
            # alone so the next attempt can succeed.
            logger.warning(
                "Could not renew %s access token for user=%s", provider.name, user.id
            )
            return None

        setattr(user, provider.access, token)
        setattr(user, provider.expires, expiry_from(response))
        # Providers may rotate the refresh token. The old one can stop working
        # once the new one is issued, so it is replaced whenever one is returned.
        if response.get("refresh_token"):
            setattr(user, provider.refresh, response["refresh_token"])
        if db is not None:
            db.add(user)
        logger.info("Renewed %s access token for user=%s", provider.name, user.id)
        return token
