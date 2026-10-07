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
    # False means the verdict was reached but the mailbox did not apply it; the
    # message is still where it was. Surfaced so the UI never shows an
    # unenforced block as a block.
    enforced: bool = False
    # Set when the message was delivered first and pulled back later, so a
    # reader can tell a verdict reached at delivery from one reached on
    # evidence that arrived afterwards.
    remediated_at: datetime | None = None
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
