from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_scan_service
from app.core.logging import get_logger
from app.database.database import get_db
from app.database.models import User
from app.repositories.email_repository import EmailRepository
from app.schemas.scan import ScanAllRequest, ScanAllResponse, ScanResultResponse
from app.services.scan_service import ScanService

logger = get_logger("scan")
router = APIRouter(prefix="/scan", tags=["Scan"])


@router.post("/email/{email_id}", response_model=ScanResultResponse)
async def scan_email(
    email_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    scan_service: ScanService = Depends(get_scan_service),
) -> ScanResultResponse:
    repo = EmailRepository(db)
    email = await repo.get_by_id(email_id, current_user.id)
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    result = await scan_service.scan_email(db, email)
    return ScanResultResponse.model_validate(result)


@router.post("/all", response_model=ScanAllResponse)
async def scan_all_emails(
    payload: ScanAllRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    scan_service: ScanService = Depends(get_scan_service),
) -> ScanAllResponse:
    results = await scan_service.scan_all(db, current_user.id, payload.max_emails)

    quarantined = sum(1 for r in results if r.risk_level.value in ("high", "critical"))
    safe = sum(1 for r in results if r.risk_level.value in ("safe", "low"))

    return ScanAllResponse(
        scanned=len(results),
        quarantined=quarantined,
        safe=safe,
        results=[ScanResultResponse.model_validate(r) for r in results],
    )


@router.get("/result/{email_id}", response_model=ScanResultResponse)
async def get_scan_result(
    email_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScanResultResponse:
    repo = EmailRepository(db)
    email = await repo.get_by_id(email_id, current_user.id)
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    if not email.scan_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan result not found. Run scan first.",
        )
    return ScanResultResponse.model_validate(email.scan_result)
