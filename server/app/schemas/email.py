from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EmailStatusEnum(str, Enum):
    PENDING = "pending"
    SCANNED = "scanned"
    SAFE = "safe"
    QUARANTINED = "quarantined"
    BLOCKED = "blocked"


class EmailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    gmail_message_id: str
    sender: str
    recipient: str
    subject: str
    received_at: datetime | None
    status: EmailStatusEnum
    risk_score: float
    mailbox: str
    created_at: datetime


class EmailDetailResponse(EmailResponse):
    body_text: str | None = None
    body_html: str | None = None
    raw_headers: dict | None = None


class EmailListResponse(BaseModel):
    items: list[EmailResponse]
    total: int
    page: int
    page_size: int


class FetchEmailsRequest(BaseModel):
    mailbox: str = Field(default="PendingScan", pattern="^(inbox|spam|trash|unread|recent|PendingScan)$")
    max_results: int = Field(default=20, ge=1, le=100)
