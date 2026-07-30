from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from app.core.config import get_settings
from app.core.logging import get_logger
from app.utils.email_parser import ParsedAttachment, ParsedEmail

logger = get_logger("gmail")


@dataclass
class GmailMessage:
    message_id: str
    parsed: ParsedEmail
    mailbox: str = "inbox"


class GmailService:
    """
    Gmail API integration service.
    Uses Google OAuth2 tokens when configured; falls back to mock data for MVP.
    """

    SCOPES = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
    ]

    def __init__(self) -> None:
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return bool(
            self.settings.google_client_id and self.settings.google_client_secret
        )

    def get_oauth_url(self, state: str) -> str:
        """Generate Google OAuth authorization URL."""
        base = "https://accounts.google.com/o/oauth2/v2/auth"
        params = (
            f"client_id={self.settings.google_client_id}"
            f"&redirect_uri={self.settings.google_redirect_uri}"
            f"&response_type=code"
            f"&scope={'%20'.join(self.SCOPES)}"
            f"&access_type=offline"
            f"&prompt=consent"
            f"&state={state}"
        )
        return f"{base}?{params}"

    async def exchange_code(self, code: str) -> dict[str, Any]:
        """
        Exchange authorization code for tokens.
        MVP: returns mock tokens when Google API not configured.
        """
        if not self.is_configured():
            logger.warning("Google OAuth not configured, returning mock tokens")
            return {
                "access_token": "mock_access_token",
                "refresh_token": "mock_refresh_token",
                "expires_in": 3600,
            }

        # Future: use google-auth-oauthlib / httpx to exchange code
        logger.info("Google token exchange placeholder invoked")
        return {
            "access_token": "mock_access_token",
            "refresh_token": "mock_refresh_token",
            "expires_in": 3600,
        }

    async def fetch_messages(
        self,
        user_id: UUID,
        access_token: str | None,
        mailbox: str = "inbox",
        max_results: int = 20,
    ) -> list[GmailMessage]:
        """
        Fetch emails from Gmail.
        MVP: returns mock emails when token unavailable or API not configured.
        """
        if access_token and self.is_configured():
            return await self._fetch_from_gmail_api(access_token, mailbox, max_results)

        logger.info(
            "Using mock Gmail data for user=%s mailbox=%s", user_id, mailbox
        )
        return self._generate_mock_messages(mailbox, max_results)

    async def _fetch_from_gmail_api(
        self,
        access_token: str,
        mailbox: str,
        max_results: int,
    ) -> list[GmailMessage]:
        """
        Future Gmail API integration point.
        Requires google-api-python-client.
        """
        logger.info("Gmail API fetch placeholder (mailbox=%s)", mailbox)
        return self._generate_mock_messages(mailbox, max_results)

    def _generate_mock_messages(
        self, mailbox: str, max_results: int
    ) -> list[GmailMessage]:
        mock_data = [
            {
                "sender": "admin@paypaI.com",
                "recipient": "user@company.com",
                "subject": "Account Suspended - Verify Now",
                "body": "Your account has been suspended. Click here to verify: http://bit.ly/fake-login",
                "spf": "spf=fail",
                "dkim": "dkim=fail",
                "dmarc": "dmarc=fail",
                "reply_to": "support@phishing-site.com",
            },
            {
                "sender": "hr@company-portal.net",
                "recipient": "all-staff@company.com",
                "subject": "Q3 Bonus Document Attached",
                "body": "Please review the attached bonus document.",
                "attachments": [
                    ParsedAttachment("bonus_Q3.pdf.exe", "application/octet-stream", 204800),
                ],
            },
            {
                "sender": "notifications@slack.com",
                "recipient": "user@company.com",
                "subject": "New message in #security",
                "body": "You have a new message in the security channel.",
                "spf": "spf=pass",
                "dkim": "dkim=pass",
                "dmarc": "dmarc=pass",
            },
            {
                "sender": "support@microsoft-update.com",
                "recipient": "user@company.com",
                "subject": "Action Required: Password Reset",
                "body": "Reset your password immediately at http://192.168.1.1/login",
            },
            {
                "sender": "ceo@company.com",
                "recipient": "finance@company.com",
                "subject": "Urgent Wire Transfer Request",
                "body": "Please process an urgent wire transfer. Act now!",
                "spf": "spf=pass",
                "dkim": "dkim=pass",
            },
        ]

        messages: list[GmailMessage] = []
        for i, data in enumerate(mock_data[:max_results]):
            msg_id = f"mock_{mailbox}_{uuid4().hex[:12]}"
            headers = {
                "From": data["sender"],
                "To": data["recipient"],
                "Subject": data["subject"],
                "Date": datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000"),
                "Message-ID": f"<{msg_id}@mail.example.com>",
                "Authentication-Results": f"{data.get('spf', 'spf=none')}; {data.get('dkim', 'dkim=none')}; {data.get('dmarc', 'dmarc=none')}",
            }
            if data.get("reply_to"):
                headers["Reply-To"] = data["reply_to"]

            parsed = ParsedEmail(
                sender=data["sender"],
                recipient=data["recipient"],
                subject=data["subject"],
                date=datetime.now(timezone.utc),
                message_id=headers["Message-ID"],
                reply_to=data.get("reply_to", ""),
                spf=data.get("spf"),
                dkim=data.get("dkim"),
                dmarc=data.get("dmarc"),
                body_text=data["body"],
                urls=[],
                attachments=data.get("attachments", []),
                raw_headers=headers,
            )
            from app.utils.email_parser import extract_urls
            parsed.urls = extract_urls(parsed.body_text)

            messages.append(GmailMessage(message_id=msg_id, parsed=parsed, mailbox=mailbox))

        return messages
