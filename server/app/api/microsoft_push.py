"""
The Outlook push endpoint.

Microsoft Graph posts here when mail arrives in a subscribed inbox. Like the
Gmail endpoint it is public by design, so the request is a claim until checked.
Graph does not sign notifications; what it does is echo back the clientState
secret this gateway chose when it created the subscription. A notification is
acted on only when it names a subscription this gateway holds and carries that
subscription's secret.

Even then the notification is only a prompt. It names a subscription, never a
message to trust: the work it triggers is the ordinary delta sync, which asks
Graph what actually arrived.
"""

import hmac

from fastapi import APIRouter, BackgroundTasks, Request, Response, status
from sqlalchemy import select

from app.core.config import get_settings
from app.core.logging import get_logger
from app.database.database import AsyncSessionLocal
from app.database.models import User
from app.services.outlook_sync import OutlookSyncService

logger = get_logger("microsoft_push")
router = APIRouter(prefix="/microsoft", tags=["Microsoft"])

# Graph's validation tokens are short opaque strings. Anything far longer is not
# from Graph, and is not echoed back.
MAX_VALIDATION_TOKEN = 1024


@router.post("/push", summary="Receive Outlook new-mail notifications from Microsoft Graph")
async def microsoft_push(request: Request, background: BackgroundTasks) -> Response:
    """
    Validate a new subscription, or accept a batch of notifications.

    Graph expects 202 within three seconds and retries otherwise, so the sync
    each notification asks for runs after the response is sent. A notification
    this gateway will not act on is still acknowledged: refusing it would only
    make Graph send it again.
    """
    # Subscription creation: Graph checks the endpoint is ours by asking it to
    # echo a token, as plain text, within ten seconds.
    validation_token = request.query_params.get("validationToken")
    if validation_token is not None:
        if len(validation_token) > MAX_VALIDATION_TOKEN:
            return Response(status_code=status.HTTP_400_BAD_REQUEST)
        return Response(
            content=validation_token,
            media_type="text/plain",
            headers={"X-Content-Type-Options": "nosniff"},
        )

    if not get_settings().microsoft_push_enabled:
        return Response(status_code=status.HTTP_202_ACCEPTED)

    try:
        payload = await request.json()
    except (ValueError, UnicodeDecodeError):
        logger.warning("Outlook push body was not JSON")
        return Response(status_code=status.HTTP_202_ACCEPTED)

    notifications = payload.get("value") if isinstance(payload, dict) else None
    if not isinstance(notifications, list):
        return Response(status_code=status.HTTP_202_ACCEPTED)

    async with AsyncSessionLocal() as db:
        user_ids = await _verified_users(db, notifications)

    # One sync per mailbox, however many messages the batch announced: the
    # delta sync collects all of them.
    for user_id in user_ids:
        background.add_task(_sync_mailbox, user_id)

    return Response(status_code=status.HTTP_202_ACCEPTED)


async def _verified_users(db, notifications: list) -> list:
    user_ids: list = []
    for notification in notifications:
        if not isinstance(notification, dict):
            continue
        subscription_id = notification.get("subscriptionId")
        client_state = notification.get("clientState")
        if not isinstance(subscription_id, str) or not isinstance(client_state, str):
            continue

        result = await db.execute(
            select(User).where(User.microsoft_subscription_id == subscription_id)
        )
        user = result.scalar_one_or_none()
        if user is None or not user.microsoft_client_state:
            # Not an error: a replaced subscription keeps notifying until it lapses.
            logger.info("Outlook push for a subscription this gateway does not hold")
            continue
        if not hmac.compare_digest(
            client_state.encode(), user.microsoft_client_state.encode()
        ):
            logger.warning(
                "Outlook push rejected: clientState mismatch for subscription %s",
                subscription_id,
            )
            continue
        if user.id not in user_ids:
            user_ids.append(user.id)
    return user_ids


async def _sync_mailbox(user_id) -> None:
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        if user is None:
            return
        try:
            outcome = await OutlookSyncService().sync_user(db, user, reason="push")
            await db.commit()
        except Exception as e:
            # The sweep will pick the mailbox up; this is logged, not retried.
            logger.error(
                "Outlook push sync failed for user=%s: %s", user_id, e, exc_info=True
            )
            await db.rollback()
            return
    logger.info(
        "Outlook push processed for user=%s: fetched=%d scanned=%d",
        user_id,
        outcome.fetched,
        outcome.scanned,
    )
