from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RiskLevelEnum(str, Enum):
    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ScanResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email_id: UUID
    header_score: float
    url_score: float
    attachment_score: float
    ai_score: float
    perceptual_score: float = 0.0
    final_score: float
    risk_level: RiskLevelEnum
    explanation: str | None
    findings: dict | None
    scan_time: datetime


class ScanAllRequest(BaseModel):
    max_emails: int = Field(default=50, ge=1, le=200)


class ScanAllResponse(BaseModel):
    scanned: int
    quarantined: int
    safe: int
    results: list[ScanResultResponse]
