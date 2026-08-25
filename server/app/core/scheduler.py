import asyncio
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.database.models import User
from app.services.gmail_service import GmailService
from app.services.scan_service import ScanService
from app.repositories.email_repository import EmailRepository
from app.core.logging import get_logger

logger = get_logger("scheduler")

async def fetch_emails_job():
    logger.info("Running scheduled fetch_emails_job")
    try:
        async with AsyncSessionLocal() as db:
            stmt = select(User).where(User.google_access_token.isnot(None))
            result = await db.execute(stmt)
            users = result.scalars().all()

            if not users:
                logger.info("No users with Google access tokens found in scheduler.")
                return

            gmail_service = GmailService()
            scan_service = ScanService()
            repo = EmailRepository(db)

            for user in users:
                try:
                    logger.info(f"Fetching emails for user={user.id} ({user.email})")
                    messages = await gmail_service.fetch_messages(
                        user,
                        user.google_access_token,
                        mailbox="inbox",
                        max_results=10,
                        db=db,
                    )
                    scanned_emails = 0
                    for msg in messages:
                        # 1. Save email to database first
                        email_record = await repo.create_from_gmail(user.id, msg)
                        
                        # Only scan if it's pending (to avoid rescanning)
                        if email_record.status != "pending":
                            continue

                        parsed = msg.parsed
                        
                        header_result = scan_service.header_service.analyze(parsed)
                        url_result = scan_service.url_service.analyze(parsed.urls)
                        attachment_result = scan_service.attachment_service.analyze(parsed.attachments)
                        ai_result = scan_service.ai_service.analyze(parsed)

                        risk = scan_service.risk_engine.calculate(
                            header_result, url_result, attachment_result, ai_result
                        )

                        # 2. Save scan result
                        from app.database.models import ScanResult, EmailStatus, RiskLevel
                        scan_record = ScanResult(
                            email_id=email_record.id,
                            header_score=header_result.score,
                            url_score=url_result.score,
                            attachment_score=attachment_result.score,
                            ai_score=ai_result.score,
                            final_score=risk.final_score,
                            risk_level=risk.risk_level,
                            findings={"headers": header_result.findings, "urls": url_result.findings, "attachments": attachment_result.findings, "ai": ai_result.reasons}
                        )
                        await repo.save_scan_result(scan_record)

                        # 3. Update email status
                        email_record.risk_score = risk.final_score

                        if risk.risk_level.value in ["high", "critical"]:
                            logger.info(f"Email {msg.message_id} is unsafe ({risk.risk_level.value}). Moving to SPAM.")
                            email_record.status = EmailStatus.QUARANTINED
                            await gmail_service.modify_message_labels(
                                user.google_access_token,
                                msg.message_id,
                                add_labels=["SPAM"],
                                remove_labels=["INBOX"]
                            )
                        else:
                            logger.info(f"Email {msg.message_id} is safe ({risk.risk_level.value}). Leaving in INBOX.")
                            email_record.status = EmailStatus.SAFE
                        
                        db.add(email_record)
                        scanned_emails += 1
                    
                    if scanned_emails > 0:
                        await db.commit()
                    
                    logger.info(f"Fetched and scanned {scanned_emails} emails for user {user.email}")
                except Exception as e:
                    logger.error(f"Failed to fetch/scan for user {user.id}: {e}")
    except Exception as e:
        logger.error(f"Error in scheduled fetch_emails_job: {e}")

async def run_scheduler():
    logger.info("Background scheduler started (fetching emails every 5 minutes).")
    while True:
        await fetch_emails_job()
        await asyncio.sleep(300)

_scheduler_task = None

def start_scheduler():
    global _scheduler_task
    _scheduler_task = asyncio.create_task(run_scheduler())

def stop_scheduler():
    global _scheduler_task
    if _scheduler_task:
        _scheduler_task.cancel()
