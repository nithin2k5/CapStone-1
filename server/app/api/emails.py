from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_gmail_service
from app.core.logging import get_logger
from app.database.database import get_db
from app.database.models import EmailStatus, User
from app.repositories.email_repository import EmailRepository
from app.schemas.email import (
    EmailDetailResponse,
    EmailListResponse,
    EmailResponse,
    FetchEmailsRequest,
)
from app.services.gmail_service import GmailService
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


@router.get("/{email_id}", response_model=EmailDetailResponse)
async def get_email(
    email_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmailDetailResponse:
    repo = EmailRepository(db)
    email = await repo.get_by_id(email_id, current_user.id)
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    return EmailDetailResponse.model_validate(email)


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
            messages = await microsoft_service.fetch_messages(
                current_user,
                current_user.microsoft_access_token,
                payload.mailbox,
                payload.max_results,
                db=db,
            )
        else:
            messages = await gmail_service.fetch_messages(
                current_user,
                current_user.google_access_token,
                payload.mailbox,
                payload.max_results,
                db=db,
            )
    except ValueError as e:
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
