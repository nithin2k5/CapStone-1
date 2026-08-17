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
    from app.services.scan_service import ScanService
    scan_service = ScanService()

    logger.info(
        "Fetching emails for user=%s mailbox=%s",
        current_user.id,
        payload.mailbox,
    )

    messages = await gmail_service.fetch_messages(
        current_user,
        current_user.google_access_token,
        payload.mailbox,
        payload.max_results,
        db=db,
    )

    import uuid
    from datetime import datetime, timezone
    results = []

    for msg in messages:
        parsed = msg.parsed
        
        header_result = scan_service.header_service.analyze(parsed)
        url_result = scan_service.url_service.analyze(parsed.urls)
        attachment_result = scan_service.attachment_service.analyze(parsed.attachments)
        ai_result = scan_service.ai_service.analyze(parsed)

        risk = scan_service.risk_engine.calculate(
            header_result, url_result, attachment_result, ai_result
        )

        status = "safe"
        if risk.risk_level.value in ["high", "critical"]:
            status = "blocked"
            await gmail_service.modify_message_labels(
                current_user.google_access_token,
                msg.message_id,
                add_labels=["SPAM"],
                remove_labels=["INBOX"]
            )
        else:
            status = "safe"

        fake_email = EmailResponse(
            id=uuid.uuid4(),
            gmail_message_id=msg.message_id,
            sender=parsed.sender,
            recipient=parsed.recipient,
            subject=parsed.subject,
            received_at=parsed.date if parsed.date else datetime.now(timezone.utc),
            status=status,
            risk_score=risk.final_score,
            mailbox=msg.mailbox,
            created_at=datetime.now(timezone.utc)
        )
        results.append(fake_email)

    return EmailListResponse(
        items=results,
        total=len(results),
        page=1,
        page_size=len(results),
    )
