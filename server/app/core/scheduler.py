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
                    
                    new_emails = 0
                    for msg in messages:
                        email = await repo.create_from_gmail(user.id, msg)
                        # if it's new, it will be in pending status
                        if email and email.status.value == "pending":
                            new_emails += 1
                            await scan_service.scan_email(db, email)
                    
                    logger.info(f"Fetched and scanned {new_emails} new emails for user {user.email}")
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
