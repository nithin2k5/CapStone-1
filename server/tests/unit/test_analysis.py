import pytest
from app.services.header_analysis import HeaderAnalysisService
from app.services.risk_engine import RiskEngine
from app.services.url_analysis import URLAnalysisService
from app.utils.email_parser import ParsedEmail, extract_urls


class TestEmailParser:
    def test_extract_urls(self):
        text = "Visit https://example.com and http://bit.ly/abc"
        urls = extract_urls(text)
        assert "https://example.com" in urls
        assert "http://bit.ly/abc" in urls

    def test_parse_minimal_email(self):
        parsed = ParsedEmail(
            sender="test@example.com",
            subject="Hello",
            body_text="Click http://evil.com",
        )
        assert parsed.sender == "test@example.com"


class TestURLAnalysis:
    def test_detects_shortened_url(self):
        service = URLAnalysisService()
        result = service.analyze(["http://bit.ly/malicious"])
        assert result.score > 0
        assert len(result.flagged_urls) == 1

    def test_detects_ip_url(self):
        service = URLAnalysisService()
        result = service.analyze(["http://192.168.1.1/login"])
        assert result.score > 0


class TestHeaderAnalysis:
    def test_missing_spf_dkim(self):
        service = HeaderAnalysisService()
        parsed = ParsedEmail(sender="attacker@fake.com", spf=None, dkim=None, dmarc=None)
        result = service.analyze(parsed)
        assert result.score > 0
        assert any("SPF" in f for f in result.findings)


class TestRiskEngine:
    def test_calculate_risk(self):
        from app.services.ai_analysis import AIAnalysisService
        from app.services.attachment_analysis import AttachmentAnalysisService

        engine = RiskEngine()
        header = HeaderAnalysisService().analyze(
            ParsedEmail(spf="spf=fail", dkim="dkim=fail")
        )
        url = URLAnalysisService().analyze(["http://bit.ly/bad"])
        attachment = AttachmentAnalysisService().analyze([])
        ai = AIAnalysisService().analyze(
            ParsedEmail(subject="Urgent verify your account now")
        )

        result = engine.calculate(header, url, attachment, ai)
        assert result.final_score > 0
        assert result.risk_level.value in ("safe", "low", "medium", "high", "critical")
