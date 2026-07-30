import re
from dataclasses import dataclass, field
from datetime import datetime
from email import message_from_string
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import urlparse


@dataclass
class ParsedAttachment:
    filename: str
    content_type: str
    size: int
    sha256: str | None = None


@dataclass
class ParsedEmail:
    sender: str = ""
    recipient: str = ""
    subject: str = ""
    date: datetime | None = None
    message_id: str = ""
    reply_to: str = ""
    return_path: str = ""
    received_chain: list[str] = field(default_factory=list)
    spf: str | None = None
    dkim: str | None = None
    dmarc: str | None = None
    body_text: str = ""
    body_html: str = ""
    urls: list[str] = field(default_factory=list)
    attachments: list[ParsedAttachment] = field(default_factory=list)
    raw_headers: dict[str, Any] = field(default_factory=dict)


URL_PATTERN = re.compile(
    r"https?://[^\s<>\"{}|\\^`\[\]]+|www\.[^\s<>\"{}|\\^`\[\]]+",
    re.IGNORECASE,
)


def extract_urls(text: str) -> list[str]:
    if not text:
        return []
    urls = URL_PATTERN.findall(text)
    normalized: list[str] = []
    for url in urls:
        if url.lower().startswith("www."):
            url = f"http://{url}"
        normalized.append(url)
    return list(dict.fromkeys(normalized))


def parse_email_content(
    raw_headers: dict[str, str],
    body_text: str = "",
    body_html: str = "",
    attachments: list[ParsedAttachment] | None = None,
) -> ParsedEmail:
    headers_lower = {k.lower(): v for k, v in raw_headers.items()}

    received_chain = []
    for key, value in raw_headers.items():
        if key.lower() == "received":
            received_chain.append(value)

    auth_results = headers_lower.get("authentication-results", "")
    spf = _extract_auth(auth_results, "spf")
    dkim = _extract_auth(auth_results, "dkim")
    dmarc = _extract_auth(auth_results, "dmarc")

    date_str = headers_lower.get("date", "")
    parsed_date = None
    if date_str:
        try:
            parsed_date = parsedate_to_datetime(date_str)
        except (ValueError, TypeError):
            parsed_date = None

    combined_text = f"{body_text} {body_html}"
    urls = extract_urls(combined_text)

    return ParsedEmail(
        sender=headers_lower.get("from", ""),
        recipient=headers_lower.get("to", ""),
        subject=headers_lower.get("subject", ""),
        date=parsed_date,
        message_id=headers_lower.get("message-id", ""),
        reply_to=headers_lower.get("reply-to", ""),
        return_path=headers_lower.get("return-path", ""),
        received_chain=received_chain,
        spf=spf,
        dkim=dkim,
        dmarc=dmarc,
        body_text=body_text,
        body_html=body_html,
        urls=urls,
        attachments=attachments or [],
        raw_headers=raw_headers,
    )


def _extract_auth(auth_results: str, mechanism: str) -> str | None:
    pattern = rf"{mechanism}=\w+"
    match = re.search(pattern, auth_results, re.IGNORECASE)
    return match.group(0) if match else None


def parse_raw_email(raw_email: str) -> ParsedEmail:
    msg = message_from_string(raw_email)
    headers = {k: v for k, v in msg.items()}
    body_text = ""
    body_html = ""
    attachments: list[ParsedAttachment] = []

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition", ""))
            if "attachment" in disposition:
                filename = part.get_filename() or "unknown"
                payload = part.get_payload(decode=True) or b""
                attachments.append(
                    ParsedAttachment(
                        filename=filename,
                        content_type=content_type,
                        size=len(payload),
                    )
                )
            elif content_type == "text/plain" and not body_text:
                body_text = part.get_payload(decode=True).decode("utf-8", errors="ignore")
            elif content_type == "text/html" and not body_html:
                body_html = part.get_payload(decode=True).decode("utf-8", errors="ignore")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body_text = payload.decode("utf-8", errors="ignore")

    return parse_email_content(headers, body_text, body_html, attachments)


def extract_domain(email_or_url: str) -> str:
    if "@" in email_or_url:
        return email_or_url.split("@")[-1].strip(">").lower()
    try:
        parsed = urlparse(email_or_url if "://" in email_or_url else f"http://{email_or_url}")
        return (parsed.hostname or "").lower()
    except Exception:
        return ""
