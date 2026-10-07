import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.database.models import Email, PayloadSighting
from app.repositories.payload_repository import PayloadSightingRepository
from app.utils.email_parser import (
    INVISIBLE_CODEPOINTS,
    RenderedEmail,
    extract_domain,
)

logger = get_logger("campaign_analysis")


@dataclass
class CampaignAnalysisResult:
    ran: bool = False
    matches: int = 0
    distinct_domains: int = 0
    crosses_domains: bool = False
    first_seen: datetime | None = None
    fingerprints: list[str] = field(default_factory=list)
    sample: str = ""
    skipped_reason: str = ""

    @property
    def repeat_of_quarantined(self) -> bool:
        return self.ran and self.matches > 0


class CampaignAnalysisService:
    """
    Recognise a concealed payload that has been seen before.

    Every other analyser judges a message alone. This one asks whether its hidden
    half has arrived here already — and if the message it arrived in was
    quarantined, carries that verdict forward.

    The reason it works is what an attacker has to change to evade the rest of the
    pipeline. Rotating the sending domain resets the header analyser, the URL
    reputation and the sender history all at once; it changes nothing about the
    text written in the concealed half, because that text is the attack. So the
    thing they must keep constant is the thing worth identifying.

    Fingerprints are taken after normalisation — invisible codepoints stripped,
    whitespace collapsed, case folded — so the mutations that defeat pattern
    matching do not mint a new identity. The adaptive benchmark's shredding and
    span-splitting moves leave the fingerprint unchanged.

    Only fragments from quarantined messages are treated as evidence. Repetition
    on its own is the normal condition of bulk mail: shared footers, preheaders
    and unsubscribe boilerplate repeat across senders constantly, and scoring
    repetition alone would flag all of it.
    """

    # Short fragments collide across unrelated mail — "unsubscribe", a date, a
    # company name — so they are not identities worth storing.
    MIN_FRAGMENT_CHARS = 24
    MAX_FRAGMENTS = 12
    SAMPLE_CHARS = 200

    @staticmethod
    def fingerprint(text: str) -> str:
        """
        The identity of a concealed fragment, under every rewrite that leaves it
        reading the same.

        Whitespace is removed rather than collapsed. Splitting a payload across
        spans cuts it at arbitrary points, and the parser puts a separator where
        each block element was — so a cut mid-word leaves "cor respondence" where
        the original had none. Collapsing preserves that difference and hands the
        attacker a new identity for the price of one <div>.
        """
        normalised = INVISIBLE_CODEPOINTS.sub("", text or "")
        normalised = re.sub(r"\s+", "", normalised).casefold()
        return hashlib.sha256(normalised.encode("utf-8")).hexdigest()[:32]

    def _fragments(self, rendered: RenderedEmail | None) -> list[tuple[str, str]]:
        """(fingerprint, sample) for each concealed fragment worth identifying."""
        if rendered is None:
            return []

        seen: dict[str, str] = {}
        candidates = [segment.text for segment in rendered.hidden_segments]
        # The whole concealed half as one fragment too: an attacker who splits a
        # payload across spans changes every per-span fingerprint and not this one.
        if rendered.hidden_text.strip():
            candidates.append(rendered.hidden_text)

        for text in candidates:
            cleaned = text.strip()
            if len(cleaned) < self.MIN_FRAGMENT_CHARS:
                continue
            mark = self.fingerprint(cleaned)
            seen.setdefault(mark, cleaned[: self.SAMPLE_CHARS])
            if len(seen) >= self.MAX_FRAGMENTS:
                break

        return list(seen.items())

    async def analyze(
        self, db: AsyncSession, email: Email, rendered: RenderedEmail | None
    ) -> CampaignAnalysisResult:
        """Has any of this message's concealed text been quarantined here before?"""
        fragments = self._fragments(rendered)
        if not fragments:
            return CampaignAnalysisResult(skipped_reason="No concealed text to identify")

        fingerprints = [mark for mark, _ in fragments]
        try:
            prior = await PayloadSightingRepository(db).prior_sightings(
                fingerprints, email.user_id, exclude_email_id=email.id
            )
        except Exception as e:
            logger.error(
                "Campaign lookup failed (%s: %s); this message was scored without "
                "payload history.",
                type(e).__name__,
                e,
                exc_info=True,
            )
            return CampaignAnalysisResult(skipped_reason="Payload history unavailable")

        domains = {s.sender_domain for s in prior if s.sender_domain}
        this_domain = extract_domain(email.sender or "")

        return CampaignAnalysisResult(
            ran=True,
            matches=len(prior),
            distinct_domains=len(domains),
            crosses_domains=bool(domains - {this_domain}),
            first_seen=prior[0].seen_at if prior else None,
            fingerprints=fingerprints,
            sample=next((s.sample for s in prior), ""),
        )

    def fingerprints(self, rendered: RenderedEmail | None) -> list[str]:
        """
        The identities of this message's concealed fragments.

        Exposed for the retroactive pass, which needs the fingerprints a verdict
        was just attached to in order to find delivered mail carrying them.
        """
        return [mark for mark, _ in self._fragments(rendered)]

    async def record(
        self,
        db: AsyncSession,
        email: Email,
        rendered: RenderedEmail | None,
        quarantined: bool,
    ) -> None:
        """
        Store this message's fragments with the verdict it received.

        Recorded after scoring rather than before, because a fragment is only
        worth propagating once there is a verdict attached to it.
        """
        fragments = self._fragments(rendered)
        if not fragments:
            return

        domain = extract_domain(email.sender or "")
        sightings = [
            PayloadSighting(
                user_id=email.user_id,
                email_id=email.id,
                fingerprint=mark,
                sender=(email.sender or "")[:320],
                sender_domain=domain[:255],
                sample=sample,
                quarantined=quarantined,
            )
            for mark, sample in fragments
        ]

        try:
            await PayloadSightingRepository(db).record(sightings)
        except Exception as e:
            logger.error(
                "Recording payload sightings failed (%s: %s); the scan itself stands.",
                type(e).__name__,
                e,
                exc_info=True,
            )
