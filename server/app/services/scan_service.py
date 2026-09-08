from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.database.models import Email, EmailStatus, RiskLevel, ScanResult
from app.repositories.email_repository import EmailRepository
from app.services.ai_analysis import AIAnalysisService
from app.services.attachment_analysis import AttachmentAnalysisService
from app.services.header_analysis import HeaderAnalysisService
from app.services.quarantine_service import QuarantineService
from app.services.risk_engine import RiskEngine
from app.services.url_analysis import URLAnalysisService
from app.utils.email_parser import ParsedEmail, parse_email_content

logger = get_logger("scan")


class ScanService:
    """Orchestrate full email scanning pipeline."""

    def __init__(
        self,
        header_service: HeaderAnalysisService | None = None,
        url_service: URLAnalysisService | None = None,
        attachment_service: AttachmentAnalysisService | None = None,
        ai_service: AIAnalysisService | None = None,
        risk_engine: RiskEngine | None = None,
        quarantine_service: QuarantineService | None = None,
    ):
        self.header_service = header_service or HeaderAnalysisService()
        self.url_service = url_service or URLAnalysisService()
        self.attachment_service = attachment_service or AttachmentAnalysisService()
        self.ai_service = ai_service or AIAnalysisService()
        self.risk_engine = risk_engine or RiskEngine()
        self.quarantine_service = quarantine_service or QuarantineService(self.risk_engine)

    def _email_to_parsed(self, email: Email) -> ParsedEmail:
        if email.raw_headers:
            return parse_email_content(
                email.raw_headers,
                email.body_text or "",
                email.body_html or "",
            )
        return ParsedEmail(
            sender=email.sender,
            recipient=email.recipient,
            subject=email.subject,
            body_text=email.body_text or "",
            body_html=email.body_html or "",
        )

    async def scan_email(
        self, db: AsyncSession, email: Email, parsed: ParsedEmail | None = None
    ) -> ScanResult:
        """
        Score an email and apply the resulting quarantine decision.

        `parsed` lets a caller that already has the provider's parse pass it in.
        Attachments are not persisted on the Email row, so reconstructing from the
        database alone yields an empty attachment list — the fetch path supplies its
        own parse to keep attachment analysis alive.
        """
        repo = EmailRepository(db)
        parsed = parsed or self._email_to_parsed(email)

        logger.info("Scanning email %s subject=%r", email.id, email.subject)

        header_result = self.header_service.analyze(parsed)
        url_result = self.url_service.analyze(parsed.urls)
        attachment_result = self.attachment_service.analyze(parsed.attachments)
        ai_result = await self.ai_service.analyze_with_llm(parsed)

        risk = self.risk_engine.calculate(
            header_result, url_result, attachment_result, ai_result
        )

        await self.quarantine_service.apply_quarantine(db, email, risk.final_score)

        if email.scan_result:
            scan = email.scan_result
            scan.header_score = risk.header_score
            scan.url_score = risk.url_score
            scan.attachment_score = risk.attachment_score
            scan.ai_score = risk.ai_score
            scan.final_score = risk.final_score
            scan.risk_level = risk.risk_level
            scan.explanation = risk.explanation
            scan.findings = risk.findings
        else:
            scan = ScanResult(
                email_id=email.id,
                header_score=risk.header_score,
                url_score=risk.url_score,
                attachment_score=risk.attachment_score,
                ai_score=risk.ai_score,
                final_score=risk.final_score,
                risk_level=risk.risk_level,
                explanation=risk.explanation,
                findings=risk.findings,
            )
            await repo.save_scan_result(scan)

        email.status = EmailStatus.SCANNED
        await db.flush()

        logger.info(
            "Scan complete email=%s score=%.2f level=%s",
            email.id,
            risk.final_score,
            risk.risk_level.value,
        )
        return scan

    async def scan_all(
        self, db: AsyncSession, user_id: UUID, max_emails: int = 50
    ) -> list[ScanResult]:
        repo = EmailRepository(db)
        emails = await repo.get_pending_emails(user_id, max_emails)
        results: list[ScanResult] = []

        for email in emails:
            scan = await self.scan_email(db, email)
            results.append(scan)

        return results
