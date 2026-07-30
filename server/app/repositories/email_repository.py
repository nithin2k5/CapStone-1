from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.models import Email, EmailStatus, ScanResult, User
from app.services.gmail_service import GmailMessage


class EmailRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, email_id: UUID, user_id: UUID) -> Email | None:
        result = await self.db.execute(
            select(Email)
            .options(selectinload(Email.scan_result))
            .where(Email.id == email_id, Email.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_gmail_id(self, gmail_message_id: str) -> Email | None:
        result = await self.db.execute(
            select(Email).where(Email.gmail_message_id == gmail_message_id)
        )
        return result.scalar_one_or_none()

    async def list_emails(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
        status: EmailStatus | None = None,
    ) -> tuple[list[Email], int]:
        query = select(Email).where(Email.user_id == user_id)
        count_query = select(func.count()).select_from(Email).where(Email.user_id == user_id)

        if status:
            query = query.where(Email.status == status)
            count_query = count_query.where(Email.status == status)

        total = (await self.db.execute(count_query)).scalar() or 0

        result = await self.db.execute(
            query.order_by(Email.received_at.desc().nullslast(), Email.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(result.scalars().all()), total

    async def create_from_gmail(
        self, user_id: UUID, gmail_msg: GmailMessage
    ) -> Email:
        existing = await self.get_by_gmail_id(gmail_msg.message_id)
        if existing:
            return existing

        parsed = gmail_msg.parsed
        email = Email(
            user_id=user_id,
            gmail_message_id=gmail_msg.message_id,
            sender=parsed.sender,
            recipient=parsed.recipient,
            subject=parsed.subject,
            received_at=parsed.date,
            status=EmailStatus.PENDING,
            raw_headers=parsed.raw_headers,
            body_text=parsed.body_text,
            body_html=parsed.body_html,
            mailbox=gmail_msg.mailbox,
        )
        self.db.add(email)
        await self.db.flush()
        return email

    async def save_scan_result(self, scan_result: ScanResult) -> ScanResult:
        self.db.add(scan_result)
        await self.db.flush()
        return scan_result

    async def get_user(self, user_id: UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_pending_emails(self, user_id: UUID, limit: int = 50) -> list[Email]:
        result = await self.db.execute(
            select(Email)
            .where(
                Email.user_id == user_id,
                Email.status.in_([EmailStatus.PENDING, EmailStatus.SCANNED]),
            )
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_dashboard_stats(self, user_id: UUID) -> dict:
        base = select(Email).where(Email.user_id == user_id)

        total = (
            await self.db.execute(
                select(func.count()).select_from(Email).where(Email.user_id == user_id)
            )
        ).scalar() or 0

        status_counts = {}
        for status in EmailStatus:
            count = (
                await self.db.execute(
                    select(func.count())
                    .select_from(Email)
                    .where(Email.user_id == user_id, Email.status == status)
                )
            ).scalar() or 0
            status_counts[status.value] = count

        return {"total": total, "status_counts": status_counts, "base_query": base}
