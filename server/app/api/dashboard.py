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

    # Hourly statistics for real-time overview (kept in monthly_statistics field for compatibility)
    dialect = db.bind.dialect.name if db.bind else "sqlite"
    time_expr = (
        func.strftime("%m-%d %H:00", Email.created_at)
        if dialect == "sqlite"
        else func.date_format(Email.created_at, "%m-%d %H:00")
    )

    from sqlalchemy import case

    time_rows = (
        await db.execute(
            select(
                time_expr.label("time"),
                func.count().label("total"),
                func.sum(
                    case(
                        (Email.status.in_([EmailStatus.BLOCKED, EmailStatus.QUARANTINED]), 1),
                        else_=0
                    )
                ).label("blocked"),
                func.sum(
                    case(
                        (Email.status.in_([EmailStatus.SAFE, EmailStatus.SCANNED, EmailStatus.PENDING]), 1),
                        else_=0
                    )
                ).label("safe"),
            )
            .where(Email.user_id == user_id)
            .group_by("time")
            .order_by("time")
            .limit(24)
        )
    ).all()

    monthly_stats: list[MonthlyStat] = []
    for row in time_rows:
        time_label = row[0].strftime("%m-%d %H:00") if isinstance(row[0], datetime) else str(row[0])
        monthly_stats.append(
            MonthlyStat(month=time_label, total=row[1], blocked=int(row[2] or 0), safe=int(row[3] or 0))
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

from fastapi.responses import StreamingResponse
import io
import csv

@router.get("/report")
async def generate_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.id
    
    # Fetch the last 1000 emails
    emails = (
        await db.execute(
            select(Email)
            .where(Email.user_id == user_id)
            .order_by(Email.created_at.desc())
            .limit(1000)
        )
    ).scalars().all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Message ID", "Received At", "Sender", "Recipient", 
        "Subject", "Status", "Risk Score"
    ])
    
    # Write data
    for email in emails:
        writer.writerow([
            email.gmail_message_id,
            email.received_at.isoformat() if email.received_at else "",
            email.sender,
            email.recipient,
            email.subject,
            email.status.value.upper(),
            email.risk_score
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=email_security_report.csv"}
    )
