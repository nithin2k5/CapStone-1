import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON as JSONB,
    String,
    Text,
    UniqueConstraint,
    Uuid as UUID,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class UserRole(str, PyEnum):
    ADMIN = "admin"
    USER = "user"


class EmailStatus(str, PyEnum):
    PENDING = "pending"
    SCANNED = "scanned"
    SAFE = "safe"
    QUARANTINED = "quarantined"
    BLOCKED = "blocked"


class RiskLevel(str, PyEnum):
    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), default=UserRole.USER, nullable=False
    )
    google_access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    microsoft_access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    microsoft_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    emails: Mapped[list["Email"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    settings: Mapped["UserSettings | None"] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)

class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)

    organization_name: Mapped[str] = mapped_column(String(255), default="Acme Corporation")
    admin_email: Mapped[str] = mapped_column(String(255), default="admin@acme.com")
    domain: Mapped[str] = mapped_column(String(255), default="acme.com")

    notif_critical: Mapped[bool] = mapped_column(Boolean, default=True)
    notif_daily: Mapped[bool] = mapped_column(Boolean, default=True)
    notif_quarantine: Mapped[bool] = mapped_column(Boolean, default=False)
    notif_weekly: Mapped[bool] = mapped_column(Boolean, default=True)

    sens_phishing: Mapped[int] = mapped_column(Integer, default=85)
    sens_malware: Mapped[int] = mapped_column(Integer, default=92)
    sens_url: Mapped[int] = mapped_column(Integer, default=78)
    sens_ai: Mapped[int] = mapped_column(Integer, default=88)

    api_key: Mapped[str] = mapped_column(String(255), default=lambda: f"seg_live_{uuid.uuid4().hex}")

    user: Mapped["User"] = relationship(back_populates="settings")


class Email(Base):
    __tablename__ = "emails"

    # A provider message id identifies a message within one mailbox, not across
    # all of them. Enforcing it globally meant the second user to receive a
    # message with an id already in the table was handed the first user's row.
    __table_args__ = (
        UniqueConstraint("user_id", "gmail_message_id", name="uq_emails_user_message"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    gmail_message_id: Mapped[str] = mapped_column(String(255), index=True)
    sender: Mapped[str] = mapped_column(String(512), nullable=False)
    recipient: Mapped[str] = mapped_column(String(512), nullable=False)
    subject: Mapped[str] = mapped_column(String(1024), default="")
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[EmailStatus] = mapped_column(
        Enum(EmailStatus, name="email_status"), default=EmailStatus.PENDING
    )
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    raw_headers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    body_text: Mapped[str | None] = mapped_column(Text(length=16777215), nullable=True)
    body_html: Mapped[str | None] = mapped_column(Text(length=16777215), nullable=True)
    mailbox: Mapped[str] = mapped_column(String(50), default="inbox")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="emails")
    scan_result: Mapped["ScanResult | None"] = relationship(
        back_populates="email", uselist=False, cascade="all, delete-orphan"
    )


class ScanResult(Base):
    __tablename__ = "scan_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("emails.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    header_score: Mapped[float] = mapped_column(Float, default=0.0)
    url_score: Mapped[float] = mapped_column(Float, default=0.0)
    attachment_score: Mapped[float] = mapped_column(Float, default=0.0)
    ai_score: Mapped[float] = mapped_column(Float, default=0.0)
    perceptual_score: Mapped[float] = mapped_column(Float, default=0.0)
    final_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel, name="risk_level"), default=RiskLevel.SAFE
    )
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    findings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    scan_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    email: Mapped["Email"] = relationship(back_populates="scan_result")
