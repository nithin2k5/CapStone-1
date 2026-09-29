from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.database.models import Email, EmailStatus, RiskLevel, ScanResult
from app.repositories.email_repository import EmailRepository
from app.services.ai_analysis import AIAnalysisService
from app.services.attachment_analysis import AttachmentAnalysisService
from app.services.audience_analysis import AudienceAnalysisService
from app.services.campaign_analysis import CampaignAnalysisService
from app.services.differential_probe import DifferentialProbeService
from app.services.dkim_verification import DKIMVerificationService
from app.services.header_analysis import HeaderAnalysisService
from app.services.perceptual_analysis import PerceptualAnalysisService
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
        perceptual_service: PerceptualAnalysisService | None = None,
        probe_service: DifferentialProbeService | None = None,
        audience_service: AudienceAnalysisService | None = None,
        campaign_service: CampaignAnalysisService | None = None,
        dkim_service: DKIMVerificationService | None = None,
        risk_engine: RiskEngine | None = None,
        quarantine_service: QuarantineService | None = None,
    ):
        self.header_service = header_service or HeaderAnalysisService()
        self.url_service = url_service or URLAnalysisService()
        self.attachment_service = attachment_service or AttachmentAnalysisService()
        self.ai_service = ai_service or AIAnalysisService()
        self.perceptual_service = perceptual_service or PerceptualAnalysisService()
        # Shares the AI service so both passes go through the same model and prompt.
        self.probe_service = probe_service or DifferentialProbeService(self.ai_service)
        self.audience_service = audience_service or AudienceAnalysisService(self.ai_service)
        self.campaign_service = campaign_service or CampaignAnalysisService()
        self.dkim_service = dkim_service or DKIMVerificationService()
        self.risk_engine = risk_engine or RiskEngine()
        self.quarantine_service = quarantine_service or QuarantineService(self.risk_engine)

    def _email_to_parsed(self, email: Email) -> ParsedEmail:
        """
        Rebuild a parse from a stored row.

        A row without captured headers used to get a hand-built ParsedEmail with
        no extracted URLs and no rendered body, which silently scored URL and
        perceptual analysis at zero however many links or concealed instructions
        the body held. Everything goes through the parser now; the stored columns
        stand in for the headers that are missing.
        """
        headers = dict(email.raw_headers or {})
        present = {key.lower() for key in headers}
        for name, value in (
            ("From", email.sender),
            ("To", email.recipient),
            ("Subject", email.subject),
        ):
            if value and name.lower() not in present:
                headers[name] = value

        return parse_email_content(
            headers,
            email.body_text or "",
            email.body_html or "",
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

        # Check the signature ourselves where the original bytes survived, and
        # fall back to the receiving server's report where they did not.
        dkim_local = await self.dkim_service.verify(parsed.raw_message)

        header_result = self.header_service.analyze(parsed, dkim_local)
        url_result = self.url_service.analyze(parsed.urls)
        attachment_result = self.attachment_service.analyze(parsed.attachments)
        ai_result = await self.ai_service.analyze_with_llm(parsed)
        perceptual_result = self.perceptual_service.analyze(parsed.rendered)
        # Second pass over the body an ordinary classifier ingests, to measure what
        # the concealed half does to the verdict. Skips itself when nothing is
        # concealed, so most messages cost no extra call.
        probe_result = await self.probe_service.probe(parsed, ai_result)
        # Who the concealed half was written for. Independent of the probe: a
        # payload in an already-clean message moves no verdict, so there is no
        # effect for the probe to measure and this is the only thing that sees it.
        audience_result = await self.audience_service.analyze(parsed.rendered)
        # Has this concealed text been quarantined here before? Rotating the
        # sending domain resets every other analyser and leaves the hidden half
        # untouched, so the payload is the part worth recognising again.
        campaign_result = await self.campaign_service.analyze(db, email, parsed.rendered)

        risk = self.risk_engine.calculate(
            header_result,
            url_result,
            attachment_result,
            ai_result,
            perceptual_result,
            probe_result,
            audience_result,
            campaign_result,
        )

        await self.quarantine_service.apply_quarantine(db, email, risk.final_score)

        if email.scan_result:
            scan = email.scan_result
            scan.header_score = risk.header_score
            scan.url_score = risk.url_score
            scan.attachment_score = risk.attachment_score
            scan.ai_score = risk.ai_score
            scan.perceptual_score = risk.perceptual_score
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
                perceptual_score=risk.perceptual_score,
                final_score=risk.final_score,
                risk_level=risk.risk_level,
                explanation=risk.explanation,
                findings=risk.findings,
            )
            await repo.save_scan_result(scan)

        # Recorded with the verdict attached, so a later message carrying the
        # same fragment inherits something worth inheriting.
        await self.campaign_service.record(
            db,
            email,
            parsed.rendered,
            quarantined=self.risk_engine.should_quarantine(risk.final_score),
        )

        email.status = EmailStatus.SCANNED
        await db.flush()

        logger.info(
            "Scan complete email=%s score=%.2f level=%s suppression=%.2f",
            email.id,
            risk.final_score,
            risk.risk_level.value,
            risk.suppression,
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
