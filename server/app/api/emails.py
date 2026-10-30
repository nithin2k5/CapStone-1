from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_gmail_service
from app.core.logging import get_logger
from app.database.database import get_db
from app.database.models import Email, EmailStatus, User
from app.repositories.email_repository import EmailRepository
from app.schemas.email import (
    EmailDetailResponse,
    EmailListResponse,
    EmailResponse,
    FetchEmailsRequest,
    LiveEmailListResponse,
    LiveEmailResponse,
)
from app.services.gmail_service import GmailService
from app.services.mailbox_tokens import MailboxTokens, MailboxUnavailable
from app.services.retention_service import fetch_window_start
from app.services.microsoft_service import MicrosoftService
from app.services.scan_service import ScanService

logger = get_logger("emails")
router = APIRouter(prefix="/emails", tags=["Emails"])


@router.get("", response_model=EmailListResponse)
async def list_emails(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: EmailStatus | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmailListResponse:
    repo = EmailRepository(db)
    emails, total = await repo.list_emails(
        current_user.id, page, page_size, status_filter
    )
    return EmailListResponse(
        items=[EmailResponse.model_validate(e) for e in emails],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/live", response_model=LiveEmailListResponse)
async def list_live_emails(
    page_token: str | None = Query(default=None, max_length=512),
    page_size: int = Query(default=50, ge=1, le=100),
    q: str = Query(default="", max_length=256),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    gmail_service: GmailService = Depends(get_gmail_service),
) -> LiveEmailListResponse:
    """
    Every received message, read from Gmail on request rather than from the
    gateway's own rows, which hold only what was scanned. Verdicts are joined
    in by provider id.
    """
    if not current_user.google_access_token:
        raise HTTPException(status_code=400, detail="No Gmail mailbox is connected.")
    try:
        page = await MailboxTokens(gmail_service, MicrosoftService()).google(
            db,
            current_user,
            lambda token: gmail_service.list_mailbox(token, page_token, page_size, q),
        )
    except (ValueError, MailboxUnavailable) as e:
        raise HTTPException(status_code=400, detail=str(e))

    ids = [entry.message_id for entry in page.entries]
    verdicts = {}
    if ids:
        rows = await db.execute(
            select(Email).where(Email.user_id == current_user.id, Email.gmail_message_id.in_(ids))
        )
        verdicts = {row.gmail_message_id: row for row in rows.scalars().all()}

    items = []
    for entry in page.entries:
        row = verdicts.get(entry.message_id)
        items.append(
            LiveEmailResponse(
                id=row.id if row else None,
                gmail_message_id=entry.message_id,
                sender=entry.sender,
                recipient=entry.recipient,
                subject=entry.subject,
                received_at=entry.received_at,
                mailbox=entry.mailbox,
                status=row.status.value if row else None,
                risk_score=row.risk_score if row else None,
                enforced=row.enforced if row else False,
            )
        )
    return LiveEmailListResponse(
        items=items,
        next_page_token=page.next_page_token,
        total_estimate=page.total_estimate,
    )


@router.get("/{email_id}", response_model=EmailDetailResponse)
async def get_email(
    email_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    gmail_service: GmailService = Depends(get_gmail_service),
) -> EmailDetailResponse:
    repo = EmailRepository(db)
    email = await repo.get_by_id(email_id, current_user.id)
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    detail = EmailDetailResponse.model_validate(email)

    # Body and headers are not stored, so they are read from Gmail for the
    # view. A failure leaves the verdict on screen without the message.
    if detail.body_text is None and current_user.google_access_token:
        try:
            live = await MailboxTokens(gmail_service, MicrosoftService()).google(
                db,
                current_user,
                lambda token: gmail_service.fetch_message(token, email.gmail_message_id),
            )
        except (ValueError, MailboxUnavailable) as e:
            logger.warning("Live read of email %s failed: %s", email.id, e)
            live = None
        if live:
            detail.body_text = live.parsed.body_text
            detail.body_html = live.parsed.body_html
            detail.raw_headers = live.parsed.raw_headers
    return detail


@router.post("/fetch", response_model=EmailListResponse)
async def fetch_emails(
    payload: FetchEmailsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    gmail_service: GmailService = Depends(get_gmail_service),
) -> EmailListResponse:
    scan_service = ScanService()
    microsoft_service = MicrosoftService()

    logger.info(
        "Fetching emails for user=%s mailbox=%s",
        current_user.id,
        payload.mailbox,
    )

    try:
        if current_user.microsoft_access_token and not current_user.google_access_token:
            messages = await MailboxTokens(gmail_service, microsoft_service).microsoft(
                db,
                current_user,
                lambda token: microsoft_service.fetch_messages(
                    current_user,
                    token,
                    payload.mailbox,
                    payload.max_results,
                    db=db,
                    since=fetch_window_start(),
                ),
            )
        else:
            messages = await MailboxTokens(gmail_service, microsoft_service).google(
                db,
                current_user,
                lambda token: gmail_service.fetch_messages(
                    current_user,
                    token,
                    payload.mailbox,
                    payload.max_results,
                    db=db,
                    since=fetch_window_start(),
                ),
            )
    except (ValueError, MailboxUnavailable) as e:
        raise HTTPException(status_code=400, detail=str(e))

    results = []
    repo = EmailRepository(db)

    for msg in messages:
        email_record, is_new = await repo.create_from_gmail(current_user.id, msg)

        if not is_new:
            results.append(EmailResponse.model_validate(email_record))
            continue

        # One pipeline for fetch, on-demand scan and the scheduled sweep. Scoring
        # inline here meant the perceptual analyser was never applied on the path
        # that ingests every message, so concealed-instruction payloads scored as
        # though that detector did not exist. The provider parse is passed through
        # because attachments are not persisted on the Email row.
        await scan_service.scan_email(db, email_record, msg.parsed)

        results.append(EmailResponse.model_validate(email_record))

    await db.commit()

    return EmailListResponse(
        items=results,
        total=len(results),
        page=1,
        page_size=len(results),
    )
