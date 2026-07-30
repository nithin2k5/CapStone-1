from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.database import get_db
from app.database.models import Email, EmailStatus, RiskLevel, ScanResult, User
from app.schemas.dashboard import (
    DashboardResponse,
    MonthlyStat,
    RecentThreat,
    RiskDistribution,
    TopDomain,
    TopSender,
)
from app.utils.email_parser import extract_domain

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    user_id = current_user.id

    total = (
        await db.execute(
            select(func.count()).select_from(Email).where(Email.user_id == user_id)
        )
    ).scalar() or 0

    scanned = (
        await db.execute(
            select(func.count())
            .select_from(Email)
            .where(Email.user_id == user_id, Email.status == EmailStatus.SCANNED)
        )
    ).scalar() or 0

    blocked = (
        await db.execute(
            select(func.count())
            .select_from(Email)
            .where(Email.user_id == user_id, Email.status == EmailStatus.BLOCKED)
        )
    ).scalar() or 0

    safe = (
        await db.execute(
            select(func.count())
            .select_from(Email)
            .where(Email.user_id == user_id, Email.status == EmailStatus.SAFE)
        )
    ).scalar() or 0

    quarantined = (
        await db.execute(
            select(func.count())
            .select_from(Email)
            .where(Email.user_id == user_id, Email.status == EmailStatus.QUARANTINED)
        )
    ).scalar() or 0

    # Top senders
    sender_rows = (
        await db.execute(
            select(Email.sender, func.count())
            .where(Email.user_id == user_id)
            .group_by(Email.sender)
            .order_by(func.count().desc())
            .limit(5)
        )
    ).all()
    top_senders = [TopSender(sender=row[0], count=row[1]) for row in sender_rows]

    # Top domains
    all_senders = (
        await db.execute(
            select(Email.sender).where(Email.user_id == user_id)
        )
    ).scalars().all()
    domain_counter: Counter = Counter()
    for sender in all_senders:
        domain = extract_domain(sender)
        if domain:
            domain_counter[domain] += 1
    top_domains = [
        TopDomain(domain=d, count=c)
        for d, c in domain_counter.most_common(5)
    ]

    # Recent threats
    threat_rows = (
        await db.execute(
            select(Email, ScanResult)
            .join(ScanResult, ScanResult.email_id == Email.id)
            .where(
                Email.user_id == user_id,
                ScanResult.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL, RiskLevel.MEDIUM]),
            )
            .order_by(ScanResult.scan_time.desc())
            .limit(10)
        )
    ).all()
    recent_threats = [
        RecentThreat(
            email_id=str(email.id),
            sender=email.sender,
            subject=email.subject,
            risk_score=scan.final_score,
            risk_level=scan.risk_level.value,
            received_at=email.received_at.isoformat() if email.received_at else None,
        )
        for email, scan in threat_rows
    ]

    # Risk distribution
    risk_rows = (
        await db.execute(
            select(ScanResult.risk_level, func.count())
            .join(Email, Email.id == ScanResult.email_id)
            .where(Email.user_id == user_id)
            .group_by(ScanResult.risk_level)
        )
    ).all()
    risk_dist = RiskDistribution()
    for level, count in risk_rows:
        setattr(risk_dist, level.value, count)

    # Monthly statistics (mock aggregation from DB)
    monthly_rows = (
        await db.execute(
            select(
                func.date_trunc("month", Email.created_at).label("month"),
                func.count().label("total"),
            )
            .where(Email.user_id == user_id)
            .group_by("month")
            .order_by("month")
            .limit(6)
        )
    ).all()

    monthly_stats: list[MonthlyStat] = []
    for row in monthly_rows:
        month_label = row[0].strftime("%Y-%m") if isinstance(row[0], datetime) else str(row[0])[:7]
        monthly_stats.append(
            MonthlyStat(month=month_label, total=row[1], blocked=0, safe=row[1])
        )

    return DashboardResponse(
        total_emails=total,
        scanned_emails=scanned,
        blocked_emails=blocked,
        safe_emails=safe,
        quarantined_emails=quarantined,
        top_senders=top_senders,
        top_domains=top_domains,
        recent_threats=recent_threats,
        risk_distribution=risk_dist,
        monthly_statistics=monthly_stats,
    )
