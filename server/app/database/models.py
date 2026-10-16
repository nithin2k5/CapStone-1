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

from app.core.crypto import EncryptedToken


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
    # EncryptedToken, not Text. These are durable full-mailbox credentials, and
    # the encryption lives in the column type so no call site has to remember
    # it — plain columns plus the intention to be careful is what produced
    # plaintext refresh tokens here in the first place.
    google_access_token: Mapped[str | None] = mapped_column(
        EncryptedToken, nullable=True
    )
    google_refresh_token: Mapped[str | None] = mapped_column(
        EncryptedToken, nullable=True
    )
    microsoft_access_token: Mapped[str | None] = mapped_column(
        EncryptedToken, nullable=True
    )
    microsoft_refresh_token: Mapped[str | None] = mapped_column(
        EncryptedToken, nullable=True
    )
    # Where this mailbox was last synchronised to. Incremental sync resumes from
    # here, which is what makes a restart resume rather than re-read the newest
    # handful of messages and lose everything behind them.
    gmail_history_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # When the Gmail watch lapses. A lapsed watch stops notifying silently, so
    # the expiry is stored and renewed rather than assumed.
    gmail_watch_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
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
    # Whether the mailbox actually carried out what `status` decided. A verdict
    # the provider refused used to be indistinguishable from one it applied, so
    # a message the dashboard called BLOCKED could still be sitting in the
    # inbox. False until an enforcement attempt succeeds.
    enforced: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # When this message was pulled back after having been delivered. A verdict
    # reached at delivery and one reached later on evidence that did not exist
    # yet are different events, and the second is the only measure of whether
    # revisiting delivered mail catches anything.
    remediated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
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


class SenderTrustDependency(Base):
    """An email whose sender assessment used a previous email as evidence."""

    __tablename__ = "sender_trust_dependencies"
    __table_args__ = (
        UniqueConstraint("email_id", "supporting_email_id", name="uq_sender_trust_edge"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    email_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("emails.id", ondelete="CASCADE"), index=True)
    supporting_email_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("emails.id", ondelete="CASCADE"), index=True)
    invalidated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class PayloadSighting(Base):
    """
    One concealed fragment, as seen in one message.

    Gateways fingerprint URLs and attachments so a second sighting inherits the
    first one's verdict. Concealed text is the same kind of object: an attacker
    sending the same payload from a fresh domain changes everything a header or
    URL analyser looks at, and none of what is written in the hidden half.

    The fingerprint is taken after normalisation, so the mutations that defeat
    pattern matching — invisible codepoints, whitespace, case, splitting across
    spans — do not produce a new identity.
    """

    __tablename__ = "payload_sightings"
    __table_args__ = (
        # A rescan must not make one message look like a campaign of its own.
        UniqueConstraint("email_id", "fingerprint", name="uq_sighting_email_payload"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    email_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("emails.id", ondelete="CASCADE"), index=True
    )
    fingerprint: Mapped[str] = mapped_column(String(64), index=True)
    sender: Mapped[str] = mapped_column(String(320), default="")
    sender_domain: Mapped[str] = mapped_column(String(255), default="", index=True)
    # A short excerpt so an analyst can see what the fingerprint stands for
    # without reopening the message it came from.
    sample: Mapped[str] = mapped_column(Text, default="")
    # Whether the message this was seen in ended up quarantined. A repeat only
    # carries a verdict if there was a verdict to carry.
    quarantined: Mapped[bool] = mapped_column(Boolean, default=False)
    seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
