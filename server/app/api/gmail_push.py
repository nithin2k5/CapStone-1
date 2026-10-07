"""
The Gmail push endpoint.

Pub/Sub delivers mailbox-change notifications here. The endpoint is reachable
from the internet by design — Google has to be able to call it — so everything
about the request is treated as a claim until verified. An unverified caller who
could get this to act would have a way to make the gateway fetch and scan on
demand, for any address they cared to name.

Two checks stand in front of the work: the request must carry an OIDC token that
Google signed for this endpoint's audience, and the service account it was
signed by must be the one configured. Only then is the payload read, and even
then it is read as data — the address it names is looked up, never trusted to
describe a user.
"""

import asyncio
import base64
import binascii
import json

from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.database.database import AsyncSessionLocal
from app.services.mailbox_sync import MailboxSyncService

logger = get_logger("gmail_push")
router = APIRouter(prefix="/gmail", tags=["Gmail"])


async def _verify_push_token(authorization: str | None) -> None:
    """
    Verify the request was signed by Google for this endpoint.

    google-auth's verifier is synchronous and fetches Google's signing keys, so
    it runs off the event loop. Failure is always 403 with no detail: the
    distinction between a missing token, a bad signature and a wrong audience is
    useful to an attacker probing the endpoint and to nobody else. The reason is
    logged instead.
    """
    settings = get_settings()

    if not authorization or not authorization.lower().startswith("bearer "):
        logger.warning("Gmail push rejected: no bearer token")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    token = authorization.split(" ", 1)[1].strip()

    if not settings.gmail_push_audience or not settings.gmail_push_service_account:
        # Refusing to run unverified is the only safe default. Accepting
        # notifications because verification was not configured would make the
        # endpoint an open trigger.
        logger.error(
            "Gmail push rejected: GMAIL_PUSH_AUDIENCE and "
            "GMAIL_PUSH_SERVICE_ACCOUNT must both be set before notifications "
            "can be verified."
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    def _verify() -> dict:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        return id_token.verify_oauth2_token(
            token, google_requests.Request(), settings.gmail_push_audience
        )

    try:
        claims = await asyncio.to_thread(_verify)
    except Exception as e:
        logger.warning("Gmail push rejected: token verification failed (%s)", e)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden"
        ) from e

    email = claims.get("email", "")
    if email != settings.gmail_push_service_account:
        logger.warning(
            "Gmail push rejected: signed by %r, expected the configured service account",
            email,
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    if not claims.get("email_verified", False):
        logger.warning("Gmail push rejected: unverified service account identity")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def _decode_notification(envelope: dict) -> tuple[str, str] | None:
    """
    Read the address and history cursor out of a Pub/Sub envelope.

    Returns None for anything malformed. Pub/Sub retries a non-2xx delivery, and
    a payload that will never parse would be retried forever, so a malformed
    envelope is acknowledged rather than refused.
    """
    message = envelope.get("message") or {}
    raw = message.get("data")
    if not raw:
        return None
    try:
        decoded = base64.urlsafe_b64decode(raw).decode("utf-8")
        payload = json.loads(decoded)
    except (binascii.Error, ValueError, UnicodeDecodeError) as e:
        logger.warning("Gmail push carried an undecodable payload: %s", e)
        return None

    address = payload.get("emailAddress")
    history_id = payload.get("historyId")
    if not address or not history_id:
        logger.warning("Gmail push payload named no address or no cursor")
        return None
    return str(address), str(history_id)


@router.post("/push", include_in_schema=False)
async def gmail_push(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict:
    """
    Handle one mailbox-change notification.

    Always answers 200 once the caller is verified. Pub/Sub treats any other
    status as a delivery failure and redelivers, so a message this gateway
    cannot process — an unknown address, an unparseable payload — must still be
    acknowledged or it returns forever. The fallback sweep is what catches
    anything genuinely lost this way.
    """
    await _verify_push_token(authorization)

    try:
        envelope = await request.json()
    except (ValueError, UnicodeDecodeError):
        logger.warning("Gmail push body was not JSON")
        return {"status": "ignored"}

    notification = _decode_notification(envelope)
    if not notification:
        return {"status": "ignored"}

    address, history_id = notification
    sync = MailboxSyncService()

    db: AsyncSession
    async with AsyncSessionLocal() as db:
        user = await sync.user_for_address(db, address)
        if not user:
            # Not an error: Google may still be notifying for a mailbox whose
            # grant has since been revoked.
            logger.info("Gmail push for an address with no connected mailbox")
            return {"status": "ignored"}

        try:
            outcome = await sync.sync_user(db, user, reason="push")
            await db.commit()
        except Exception as e:
            # A failure here is this gateway's problem, not a reason to make
            # Pub/Sub redeliver. The sweep will pick the mailbox up.
            logger.error(
                "Gmail push sync failed for user=%s: %s", user.id, e, exc_info=True
            )
            await db.rollback()
            return {"status": "error"}

    logger.info(
        "Gmail push processed: cursor=%s fetched=%d scanned=%d",
        history_id,
        outcome.fetched,
        outcome.scanned,
    )
    return {"status": "ok", "fetched": outcome.fetched, "scanned": outcome.scanned}
