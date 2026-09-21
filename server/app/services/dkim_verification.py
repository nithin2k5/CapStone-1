import asyncio
import re
from dataclasses import dataclass

from app.core.logging import get_logger

logger = get_logger("dkim")


@dataclass
class DKIMVerificationResult:
    """
    The outcome of checking a DKIM signature ourselves.

    `source` separates a verdict we produced from the absence of one. "local"
    means the signature was checked against the signing domain's published key;
    "unavailable" means verification could not run and the caller should fall
    back to whatever the receiving server reported.
    """

    verdict: str = "unknown"  # pass | fail | none | unknown
    source: str = "unavailable"  # local | unavailable
    domain: str | None = None
    selector: str | None = None
    detail: str = ""

    @property
    def is_local(self) -> bool:
        return self.source == "local"


_SIGNATURE_HEADER = re.compile(rb"^DKIM-Signature\s*:", re.IGNORECASE | re.MULTILINE)
_TAG = "(?:^|;)\\s*{}\\s*=\\s*([^;\\s]+)"


def _signature_tag(raw_message: bytes, tag: str) -> str | None:
    """Read a tag out of the first DKIM-Signature header, for reporting only."""
    match = _SIGNATURE_HEADER.search(raw_message)
    if not match:
        return None

    # The header continues across folded lines until a line that is not indented.
    header = raw_message[match.end() : match.end() + 2048].decode("utf-8", "ignore")
    header = header.split("\n\n")[0]
    found = re.search(_TAG.format(tag), header, re.MULTILINE)
    return found.group(1).strip() if found else None


class DKIMVerificationService:
    """
    Verify a DKIM signature against the signing domain's published key.

    The receiving server already did this and reported the outcome in
    Authentication-Results, which is what the header analyser reads. That report
    is only as trustworthy as whoever wrote it: it is plain text, and a message
    reaching us from anywhere other than a mailbox we trust can simply claim to
    have passed. Checking the signature here produces a verdict that cannot be
    asserted by the sender, because it rests on a DNS key lookup and a hash over
    the message as signed.

    It needs the original bytes. A message rebuilt from parsed parts no longer
    hashes to what was signed, so verification is skipped rather than reported as
    a failure — an unverifiable message is not a forged one.
    """

    # Past this the message is not worth pulling into memory to hash.
    MAX_MESSAGE_BYTES = 10 * 1024 * 1024
    DNS_TIMEOUT = 5.0
    # DNS plus the hash of a large body; beyond this the scan stops waiting.
    TOTAL_TIMEOUT = 15.0

    def __init__(self, dnsfunc=None):
        # Injectable so the suite can verify against a key it generated rather
        # than reaching the network.
        self._dnsfunc = dnsfunc

    def _verify_sync(self, raw_message: bytes) -> bool:
        import dkim

        kwargs = {"timeout": self.DNS_TIMEOUT}
        if self._dnsfunc is not None:
            kwargs["dnsfunc"] = self._dnsfunc
        return bool(dkim.verify(raw_message, **kwargs))

    async def verify(self, raw_message: bytes | None) -> DKIMVerificationResult:
        if not raw_message:
            return DKIMVerificationResult(
                detail="Original message bytes unavailable; signature not checked"
            )

        if len(raw_message) > self.MAX_MESSAGE_BYTES:
            return DKIMVerificationResult(
                detail=f"Message of {len(raw_message)} bytes exceeds the verification budget"
            )

        domain = _signature_tag(raw_message, "d")
        selector = _signature_tag(raw_message, "s")

        if not _SIGNATURE_HEADER.search(raw_message):
            # Checked, and there is nothing to check: distinct from not looking.
            return DKIMVerificationResult(
                verdict="none",
                source="local",
                detail="Message carries no DKIM signature",
            )

        try:
            verified = await asyncio.wait_for(
                asyncio.to_thread(self._verify_sync, raw_message),
                timeout=self.TOTAL_TIMEOUT,
            )
        except asyncio.TimeoutError:
            logger.warning("DKIM verification timed out for domain=%s", domain)
            return DKIMVerificationResult(
                domain=domain,
                selector=selector,
                detail="Verification timed out before the key could be resolved",
            )
        except Exception as e:
            # A malformed signature, an unresolvable key, an unsupported
            # algorithm. None of these establish that the message is forged.
            logger.info(
                "DKIM verification could not complete (%s: %s) for domain=%s",
                type(e).__name__,
                e,
                domain,
            )
            return DKIMVerificationResult(
                domain=domain,
                selector=selector,
                detail=f"Verification could not complete: {type(e).__name__}",
            )

        return DKIMVerificationResult(
            verdict="pass" if verified else "fail",
            source="local",
            domain=domain,
            selector=selector,
            detail=(
                f"Signature verified against {selector}._domainkey.{domain}"
                if verified
                else f"Signature did not verify against {selector}._domainkey.{domain}"
            ),
        )
