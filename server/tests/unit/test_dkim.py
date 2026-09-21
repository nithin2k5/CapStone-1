"""
DKIM verification, checked against a key the suite generates.

The point of verifying here rather than reading Authentication-Results is that a
verdict resting on a key lookup and a hash cannot be asserted by the sender. The
tests sign real messages and tamper with them, with DNS stubbed so nothing
touches the network.
"""

import base64

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.services.dkim_verification import DKIMVerificationService
from app.services.header_analysis import HeaderAnalysisService
from app.utils.email_parser import parse_email_content

DOMAIN = b"acme.com"
SELECTOR = b"selector1"

MESSAGE = (
    b"From: ceo@acme.com\r\n"
    b"To: finance@corp.com\r\n"
    b"Subject: Invoice\r\n"
    b"Date: Mon, 1 Jan 2024 00:00:00 +0000\r\n"
    b"\r\n"
    b"Please pay the attached invoice.\r\n"
)


@pytest.fixture(scope="module")
def signing_key():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption(),
    )
    public_der = key.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    record = b"v=DKIM1; k=rsa; p=" + base64.b64encode(public_der)
    return private_pem, record


@pytest.fixture
def signed_message(signing_key):
    import dkim

    private_pem, _ = signing_key
    signature = dkim.sign(MESSAGE, SELECTOR, DOMAIN, private_pem)
    return signature + MESSAGE


@pytest.fixture
def service(signing_key):
    _, record = signing_key

    def dns(name, timeout=5):
        assert name.rstrip(b".") == SELECTOR + b"._domainkey." + DOMAIN
        return record

    return DKIMVerificationService(dnsfunc=dns)


class TestSignatureVerdicts:
    async def test_valid_signature_passes(self, service, signed_message):
        result = await service.verify(signed_message)

        assert result.verdict == "pass"
        assert result.source == "local"
        assert result.domain == "acme.com"
        assert result.selector == "selector1"

    async def test_tampered_body_fails(self, service, signed_message):
        tampered = signed_message.replace(
            b"Please pay the attached invoice.", b"Please wire to account 999."
        )
        result = await service.verify(tampered)

        assert result.verdict == "fail"
        assert result.source == "local"

    async def test_tampered_sender_fails(self, service, signed_message):
        tampered = signed_message.replace(b"From: ceo@acme.com", b"From: ceo@evil.com")
        result = await service.verify(tampered)

        assert result.verdict == "fail"

    async def test_unsigned_message_is_none_not_failure(self, service):
        """A domain that never signed is not a domain whose signature broke."""
        result = await service.verify(MESSAGE)

        assert result.verdict == "none"
        assert result.source == "local"


class TestVerificationIsSkippedNotFailed:
    """An unverifiable message is not a forged one."""

    async def test_absent_bytes_yield_unknown(self, service):
        result = await service.verify(None)

        assert result.verdict == "unknown"
        assert result.source == "unavailable"
        assert result.is_local is False

    async def test_oversized_message_is_skipped(self, service, signed_message):
        service.MAX_MESSAGE_BYTES = 10
        result = await service.verify(signed_message)

        assert result.verdict == "unknown"
        assert result.source == "unavailable"
        assert "budget" in result.detail

    async def test_unresolvable_key_is_skipped(self, signed_message):
        def failing_dns(name, timeout=5):
            raise RuntimeError("NXDOMAIN")

        result = await DKIMVerificationService(dnsfunc=failing_dns).verify(
            signed_message
        )

        assert result.verdict == "unknown"
        assert result.source == "unavailable"


class TestLocalVerdictOverridesTheReportedOne:
    """
    Authentication-Results is plain text the sender can write. Where a signature
    was actually checked, that check decides.
    """

    def _parsed(self, reported_dkim: str):
        return parse_email_content(
            {
                "From": "ceo@acme.com",
                "Reply-To": "ceo@acme.com",
                "Message-Id": "<abcdefghijkl@acme.com>",
                "Authentication-Results": (
                    f"mx.google.com; spf=pass; {reported_dkim}; dmarc=pass"
                ),
            },
            "body",
            "",
        )

    async def test_forged_pass_is_overridden_by_a_local_failure(
        self, service, signed_message
    ):
        tampered = signed_message.replace(
            b"Please pay the attached invoice.", b"Please wire to account 999."
        )
        local = await service.verify(tampered)

        result = HeaderAnalysisService().analyze(self._parsed("dkim=pass"), local)

        assert result.dkim_verified_locally is True
        assert result.score >= HeaderAnalysisService.AUTH_WEIGHTS["dkim"]
        assert any("contradicts" in f for f in result.findings)
        # Tamper evidence carries the DMARC compounding rules.
        assert result.failed_dmarc is True

    async def test_local_pass_is_reported_as_verified(self, service, signed_message):
        local = await service.verify(signed_message)

        result = HeaderAnalysisService().analyze(self._parsed("dkim=pass"), local)

        assert result.dkim_verified_locally is True
        assert any("verified locally" in f for f in result.findings)

    async def test_reported_verdict_is_used_when_nothing_was_checked(self, service):
        local = await service.verify(None)

        result = HeaderAnalysisService().analyze(self._parsed("dkim=pass"), local)

        assert result.dkim_verified_locally is False
        assert any("skipped" in f for f in result.findings)

    def test_analyze_still_works_without_a_dkim_argument(self):
        result = HeaderAnalysisService().analyze(self._parsed("dkim=pass"))

        assert result.dkim_verified_locally is False
