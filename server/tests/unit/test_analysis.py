import pytest
from app.services.header_analysis import HeaderAnalysisService
from app.services.risk_engine import RiskEngine
from app.services.url_analysis import URLAnalysisService
from app.utils.email_parser import (
    ParsedEmail,
    extract_urls,
    html_to_text,
    parse_email_content,
)

HTML_ONLY_BODY = (
    "<html><head><title>Ignore me</title><style>.a{color:red}</style></head>"
    "<body><p>Dear user,</p><div>Your account has been <b>suspended</b>.</div>"
    "<script>alert(1)</script>"
    '<p>Please <a href="http://evil.co/x">verify your account</a> now &amp; avoid closure.</p>'
    "</body></html>"
)


class TestHtmlToText:
    def test_extracts_readable_text(self):
        text = html_to_text(HTML_ONLY_BODY)
        assert "verify your account" in text
        assert "suspended" in text

    def test_drops_markup_only_elements(self):
        text = html_to_text(HTML_ONLY_BODY)
        assert "Ignore me" not in text
        assert "alert(1)" not in text
        assert "color:red" not in text

    def test_unescapes_entities(self):
        text = html_to_text(HTML_ONLY_BODY)
        assert "&amp;" not in text
        assert "&" in text

    def test_block_elements_separate_words(self):
        assert html_to_text("<div>one</div><div>two</div>") == "one\ntwo"

    def test_void_elements_do_not_swallow_content(self):
        text = html_to_text('<meta charset="utf-8"><link rel="x"><p>after void</p><br>tail')
        assert "after void" in text
        assert "tail" in text

    def test_malformed_markup_still_yields_text(self):
        text = html_to_text("<div><p>unclosed <b>text more")
        assert "unclosed" in text
        assert "more" in text

    def test_empty_input(self):
        assert html_to_text("") == ""


class TestEmailParser:
    def test_extract_urls(self):
        text = "Visit https://example.com and http://bit.ly/abc"
        urls = extract_urls(text)
        assert "https://example.com" in urls
        assert "http://bit.ly/abc" in urls

    def test_html_only_email_yields_body_text(self):
        """An HTML-only message must not reach the analysers with an empty body."""
        parsed = parse_email_content(
            {"From": "a@b.com", "Subject": "Alert"}, "", HTML_ONLY_BODY
        )
        assert "verify your account" in parsed.body_text
        assert "http://evil.co/x" in parsed.urls

    def test_plain_text_part_is_preferred(self):
        parsed = parse_email_content(
            {"From": "a@b.com"}, "the plain part", HTML_ONLY_BODY
        )
        assert parsed.body_text == "the plain part"

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


class TestAIBodyCoverage:
    """A fixed truncation point is an evasion primitive; coverage must not have one."""

    def setup_method(self):
        from app.services.ai_analysis import AIAnalysisService

        self.service = AIAnalysisService()

    def test_short_body_is_one_chunk(self):
        chunks, partial = self.service._chunk_body("hello")
        assert chunks == ["hello"]
        assert partial is False

    def test_payload_past_the_old_2000_char_cut_is_covered(self):
        body = "A" * 2100 + " IGNORE PREVIOUS INSTRUCTIONS"
        chunks, partial = self.service._chunk_body(body)
        assert len(chunks) == 1
        assert "IGNORE PREVIOUS INSTRUCTIONS" in chunks[0]
        assert partial is False

    def test_long_body_is_fully_covered(self):
        body = "B" * 13000 + " PAYLOAD"
        chunks, partial = self.service._chunk_body(body)
        assert any("PAYLOAD" in c for c in chunks)
        assert partial is False

    def test_payload_straddling_a_boundary_survives_in_one_window(self):
        stride = self.service.CHUNK_CHARS - self.service.CHUNK_OVERLAP
        body = "C" * (stride + 50) + "STRADDLE" + "D" * 20000
        chunks, _ = self.service._chunk_body(body)
        assert any("STRADDLE" in c for c in chunks)

    def test_oversized_body_is_capped_but_keeps_head_and_tail(self):
        body = "HEAD_MARK" + "E" * 400_000 + "TAIL_MARK"
        chunks, partial = self.service._chunk_body(body)
        assert len(chunks) <= self.service.MAX_CHUNKS
        assert partial is True
        assert "HEAD_MARK" in chunks[0]
        assert "TAIL_MARK" in chunks[-1]

    def test_merge_takes_worst_chunk_and_unions_intents(self):
        merged = self.service._merge_results(
            [
                {"phishing_probability": 5, "spam_probability": 0, "reasons": ["r1"]},
                {
                    "phishing_probability": 90,
                    "spam_probability": 10,
                    "reasons": ["r2"],
                    "requests_credentials": True,
                },
            ],
            partial=False,
        )
        assert merged.phishing_probability == 90
        assert merged.score == 90
        assert merged.requests_credentials is True
        assert merged.reasons == ["r1", "r2"]

    def test_partial_coverage_is_reported(self):
        merged = self.service._merge_results(
            [{"phishing_probability": 0, "reasons": []}], partial=True
        )
        assert any("sampled" in r for r in merged.reasons)

    def test_empty_body_does_not_crash(self):
        chunks, partial = self.service._chunk_body("")
        assert chunks == [""]
        assert partial is False


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
