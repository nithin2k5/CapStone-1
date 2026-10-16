from dataclasses import asdict
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.database.models import Email, RiskLevel, ScanResult
from app.repositories.email_repository import EmailRepository
from app.repositories.trust_repository import TrustRepository
from app.services.ai_analysis import AIAnalysisService
from app.services.attachment_analysis import AttachmentAnalysisService
from app.services.audience_analysis import AudienceAnalysisService
from app.services.campaign_analysis import CampaignAnalysisService
from app.services.differential_probe import DifferentialProbeService
from app.services.dkim_verification import DKIMVerificationService
from app.services.header_analysis import HeaderAnalysisService
from app.services.impersonation_analysis import ImpersonationAnalysisService
from app.services.perceptual_analysis import PerceptualAnalysisService
from app.services.quarantine_service import QuarantineService
from app.services.risk_engine import RiskEngine
from app.services.url_analysis import URLAnalysisService
from app.services.verdict_stability import VerdictStabilityService
from app.services.fragment_isolation import FragmentIsolationService
from app.services.accessibility_analysis import AccessibilityAnalysisService
from app.services.trust_reassessment import TrustReassessmentService
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
        impersonation_service: ImpersonationAnalysisService | None = None,
        dkim_service: DKIMVerificationService | None = None,
        risk_engine: RiskEngine | None = None,
        quarantine_service: QuarantineService | None = None,
        remediation_service=None,
        stability_service=None,
        isolation_service=None,
        accessibility_service=None,
        trust_service=None,
    ):
        self.header_service = header_service or HeaderAnalysisService()
        self.url_service = url_service or URLAnalysisService()
        self.attachment_service = attachment_service or AttachmentAnalysisService()
        self.ai_service = ai_service or AIAnalysisService()
        self.perceptual_service = perceptual_service or PerceptualAnalysisService()
        # Shares the AI service so both passes go through the same model and prompt.
        self.probe_service = probe_service or DifferentialProbeService(self.ai_service)
        self.stability_service = stability_service or VerdictStabilityService(self.ai_service)
        self.isolation_service = isolation_service or FragmentIsolationService(self.ai_service)
        self.accessibility_service = accessibility_service or AccessibilityAnalysisService()
        self.audience_service = audience_service or AudienceAnalysisService(self.ai_service)
        self.campaign_service = campaign_service or CampaignAnalysisService()
        self.impersonation_service = (
            impersonation_service or ImpersonationAnalysisService()
        )
        self.dkim_service = dkim_service or DKIMVerificationService()
        self.risk_engine = risk_engine or RiskEngine()
        self.quarantine_service = quarantine_service or QuarantineService(self.risk_engine)
        # Imported here because remediation drives scans through this service,
        # and importing it at module scope would make that cycle an import-time
        # one.
        if remediation_service is None:
            from app.services.remediation_service import RemediationService

            remediation_service = RemediationService(self)
        self.remediation_service = remediation_service
        self.trust_service = trust_service or TrustReassessmentService(self)

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
        self,
        db: AsyncSession,
        email: Email,
        parsed: ParsedEmail | None = None,
        remediate: bool = True,
        reassess_trust: bool = True,
    ) -> ScanResult:
        """
        Score an email and apply the resulting quarantine decision.

        `parsed` lets a caller that already has the provider's parse pass it in.
        Attachments are not persisted on the Email row, so reconstructing from the
        database alone yields an empty attachment list — the fetch path supplies its
        own parse to keep attachment analysis alive.

        `remediate` controls whether condemning a payload here also revisits
        delivered mail carrying it. The retroactive pass sets it False on the
        rescans it drives: those messages carry the fingerprints already being
        handled, so a cascade would revisit the same set to no effect.
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
        accessibility_result = self.accessibility_service.analyze(parsed)
        # Second pass over the body an ordinary classifier ingests, to measure what
        # the concealed half does to the verdict. Skips itself when nothing is
        # concealed, so most messages cost no extra call.
        probe_result = await self.probe_service.probe(parsed, ai_result)
        stability_result = await self.stability_service.analyze(parsed, ai_result)
        isolation_result = await self.isolation_service.analyze(parsed, stability_result)
        # Who the concealed half was written for. Independent of the probe: a
        # payload in an already-clean message moves no verdict, so there is no
        # effect for the probe to measure and this is the only thing that sees it.
        audience_result = await self.audience_service.analyze(parsed.rendered)
        # Has this concealed text been quarantined here before? Rotating the
        # sending domain resets every other analyser and leaves the hidden half
        # untouched, so the payload is the part worth recognising again.
        campaign_result = await self.campaign_service.analyze(db, email, parsed.rendered)
        # Who the sender is pretending to be. Authentication answers whether the
        # claiming domain authorised the message, which is exactly what business
        # email compromise passes; this reads the relationship instead.
        impersonation_result = await self.impersonation_service.analyze(
            db, email.user_id, email.sender or "", email=email,
        )

        risk = self.risk_engine.calculate(
            header_result,
            url_result,
            attachment_result,
            ai_result,
            perceptual_result,
            probe_result,
            audience_result,
            campaign_result,
            impersonation_result,
            stability=stability_result,
            accessibility=accessibility_result,
        )

        risk.findings["isolation"] = asdict(isolation_result)
        risk.findings["sender_trust"] = {
            "recorded": impersonation_result.ran,
            "supporting_email_ids": impersonation_result.supporting_email_ids,
            "history_truncated": impersonation_result.history_truncated,
            "skipped_reason": impersonation_result.skipped_reason,
        }
        if email.scan_result and email.scan_result.findings:
            prior_reassessment = email.scan_result.findings.get("trust_reassessment")
            if prior_reassessment:
                risk.findings["trust_reassessment"] = prior_reassessment
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
            email.scan_result = scan

        # Recorded with the verdict attached, so a later message carrying the
        # same fragment inherits something worth inheriting.
        condemned = self.risk_engine.should_quarantine(risk.final_score)
        if impersonation_result.ran:
            await TrustRepository(db).record(email, impersonation_result.supporting_email_ids)
        scan.scan_time = datetime.now(timezone.utc)
        await self.campaign_service.record(
            db,
            email,
            parsed.rendered,
            quarantined=condemned,
        )

        # The verdict is the status. apply_quarantine above set BLOCKED,
        # QUARANTINED or SAFE and flushed it; this line used to overwrite all
        # three with SCANNED, so the mailbox move happened but the row recorded
        # no decision. Every scanned message read as SCANNED, which the
        # dashboard groups with safe mail, so its quarantined and blocked counts
        # were structurally zero.
        await db.flush()

        logger.info(
            "Scan complete email=%s score=%.2f level=%s suppression=%.2f",
            email.id,
            risk.final_score,
            risk.risk_level.value,
            risk.suppression,
        )

        # After the sighting is stored, not before: the retroactive pass rescans
        # delivered mail and relies on campaign analysis finding the verdict
        # just recorded. Run earlier, there would be nothing for it to find and
        # every rescan would reach the same conclusion as the first scan did.
        if remediate and condemned:
            fingerprints = self.campaign_service.fingerprints(parsed.rendered)
            try:
                await self.remediation_service.remediate_payload(
                    db, email.user_id, fingerprints, triggering_email_id=email.id
                )
            except Exception as e:
                # The scan itself stands. A failure to revisit delivered mail
                # must not discard the verdict on the message in hand.
                logger.error(
                    "Retroactive remediation failed after email %s: %s",
                    email.id,
                    e,
                    exc_info=True,
                )

        # Trust invalidation also runs for campaign-triggered rescans. Only the
        # trust traversal itself suppresses it, since it snapshots descendants.
        if reassess_trust and condemned and email.id and email.created_at:
            try:
                async with db.begin_nested():
                    outcome = await self.trust_service.reassess(db, email)
                scan.findings = {**scan.findings, "trust_invalidation": outcome}
                await db.flush()
            except Exception:
                logger.exception("Trust invalidation failed for email %s", email.id)
                scan.findings = {**scan.findings, "trust_invalidation": {"error": "Reassessment incomplete"}}
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
