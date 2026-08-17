import base64
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from typing import Any
from uuid import UUID, uuid4

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.database.models import User
from app.utils.email_parser import ParsedAttachment, ParsedEmail, extract_urls

logger = get_logger("gmail")


@dataclass
class GmailMessage:
    message_id: str
    parsed: ParsedEmail
    mailbox: str = "inbox"


def _decode_base64url(data: str) -> str:
    if not data:
        return ""
    try:
        padding = 4 - (len(data) % 4)
        if padding != 4:
            data += "=" * padding
        return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    except Exception as e:
        logger.warning("Failed to decode email body part: %s", e)
        return ""


class GmailService:
    """
    Gmail API integration service.
    Exchanges OAuth2 codes for access/refresh tokens and fetches live emails via REST API.
    Falls back to realistic mock phishing emails if OAuth is not configured or token unavailable.
    """

    SCOPES = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
    ]

    def __init__(self) -> None:
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return bool(
            self.settings.google_client_id
            and self.settings.google_client_secret
            and not self.settings.google_client_id.startswith("your-")
        )

    def get_oauth_url(self, state: str = "default_state") -> str:
        """Generate Google OAuth authorization URL with offline access to get refresh tokens."""
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

    async def exchange_code(
        self, code: str, redirect_uri: str | None = None
    ) -> dict[str, Any]:
        """Exchange authorization code for tokens via Google's token endpoint."""
        if not self.is_configured():
            logger.warning("Google OAuth not configured, returning mock tokens")
            return {
                "access_token": "mock_access_token",
                "refresh_token": "mock_refresh_token",
                "expires_in": 3600,
            }

        url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": self.settings.google_client_id,
            "client_secret": self.settings.google_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri or self.settings.google_redirect_uri,
        }
        async with httpx.AsyncClient() as client:
            res = await client.post(url, data=data)
            if res.status_code != 200:
                logger.error(
                    "Failed to exchange OAuth code: %s - %s",
                    res.status_code,
                    res.text,
                )
                return {"error": res.text}
            return res.json()

    async def get_user_info(self, access_token: str) -> dict[str, Any]:
        """Fetch user profile from Google UserInfo endpoint."""
        if access_token == "mock_access_token":
            return {"email": "mock.google@user.com", "name": "Mock Google User"}

        url = "https://www.googleapis.com/oauth2/v3/userinfo"
        async with httpx.AsyncClient() as client:
            res = await client.get(
                url, headers={"Authorization": f"Bearer {access_token}"}
            )
            if res.status_code != 200:
                logger.error(
                    "Failed to get Google userinfo: %s - %s",
                    res.status_code,
                    res.text,
                )
                return {}
            return res.json()

    async def refresh_access_token(self, refresh_token: str) -> str | None:
        """Refresh an expired access token using a stored refresh token."""
        if not self.is_configured() or refresh_token == "mock_refresh_token":
            return "mock_access_token"

        url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": self.settings.google_client_id,
            "client_secret": self.settings.google_client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        async with httpx.AsyncClient() as client:
            res = await client.post(url, data=data)
            if res.status_code == 200:
                token_data = res.json()
                new_token = token_data.get("access_token")
                logger.info("Successfully refreshed Google access token")
                return new_token
            logger.error(
                "Failed to refresh Google access token: %s - %s",
                res.status_code,
                res.text,
            )
            return None

    async def modify_message_labels(
        self,
        access_token: str,
        message_id: str,
        add_labels: list[str],
        remove_labels: list[str]
    ) -> bool:
        """Modify labels of a Gmail message (e.g., move to SPAM or TRASH)."""
        if access_token == "mock_access_token":
            logger.info("Mock modifying labels for message %s: add=%s remove=%s", message_id, add_labels, remove_labels)
            return True

        url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/modify"
        headers = {"Authorization": f"Bearer {access_token}"}
        data = {"addLabelIds": add_labels, "removeLabelIds": remove_labels}
        
        async with httpx.AsyncClient() as client:
            res = await client.post(url, headers=headers, json=data)
            if res.status_code == 200:
                logger.info("Successfully modified labels for message %s", message_id)
                return True
            logger.error("Failed to modify labels for message %s: %s - %s", message_id, res.status_code, res.text)
            return False

    async def fetch_messages(
        self,
        user: User | UUID,
        access_token: str | None = None,
        mailbox: str = "inbox",
        max_results: int = 20,
        db: AsyncSession | None = None,
    ) -> list[GmailMessage]:
        """
        Fetch live emails from Gmail API using stored OAuth tokens.
        Automatically refreshes access token if expired.
        Falls back to mock phishing emails if OAuth is unconfigured or unavailable.
        """
        if isinstance(user, User):
            user_id = user.id
            token = user.google_access_token or access_token
            refresh = user.google_refresh_token
        else:
            user_id = user
            token = access_token
            refresh = None
            user = None

        if token and token != "mock_access_token" and self.is_configured():
            try:
                messages = await self._fetch_from_gmail_api(
                    token, refresh, user, db, mailbox, max_results
                )
                if messages is not None:
                    return messages
            except Exception as e:
                logger.error("Error fetching live Gmail API messages: %s", e)

        logger.warning(
            "Failed to fetch live API messages for user=%s mailbox=%s. Token or configuration may be missing.", user_id, mailbox
        )
        return []
    async def _fetch_from_gmail_api(
        self,
        access_token: str,
        refresh_token: str | None,
        user: User | None,
        db: AsyncSession | None,
        mailbox: str,
        max_results: int,
    ) -> list[GmailMessage] | None:
        """Fetch messages via live Gmail REST API using httpx."""
        headers = {"Authorization": f"Bearer {access_token}"}
        query = "in:inbox" if mailbox.lower() == "inbox" else (f"label:{mailbox}" if mailbox == "PendingScan" else f"in:{mailbox}")
        list_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults={max_results}&q={query}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(list_url, headers=headers)
            if res.status_code == 401 and refresh_token:
                logger.info(
                    "Access token expired, attempting refresh for user=%s",
                    user.id if user else "unknown",
                )
                new_token = await self.refresh_access_token(refresh_token)
                if new_token:
                    access_token = new_token
                    headers = {"Authorization": f"Bearer {access_token}"}
                    if user and db:
                        user.google_access_token = new_token
                        db.add(user)
                        await db.commit()
                    res = await client.get(list_url, headers=headers)

            if res.status_code != 200:
                logger.error(
                    "Gmail API list messages failed: %s - %s",
                    res.status_code,
                    res.text,
                )
                return None

            data = res.json()
            message_summaries = data.get("messages", [])
            if not message_summaries:
                logger.info("No Gmail messages found matching q=%s", query)
                return []

            messages: list[GmailMessage] = []
            for item in message_summaries:
                msg_id = item["id"]
                detail_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}?format=full"
                detail_res = await client.get(detail_url, headers=headers)
                if detail_res.status_code == 200:
                    gmail_msg = self._parse_gmail_message_json(
                        detail_res.json(), mailbox
                    )
                    messages.append(gmail_msg)
                else:
                    logger.warning(
                        "Failed to fetch message detail for id=%s: %s",
                        msg_id,
                        detail_res.status_code,
                    )

            return messages

    def _parse_gmail_message_json(
        self, msg_data: dict[str, Any], mailbox: str
    ) -> GmailMessage:
        msg_id = msg_data.get("id", f"gmail_{uuid4().hex[:12]}")
        payload = msg_data.get("payload", {})

        headers_list = payload.get("headers", [])
        headers = {h.get("name", "").title(): h.get("value", "") for h in headers_list}

        sender = headers.get("From", "unknown@gmail.com")
        recipient = headers.get("To", "user@company.com")
        subject = headers.get("Subject", "(No Subject)")
        message_id = headers.get("Message-Id", f"<{msg_id}@mail.gmail.com>")
        reply_to = headers.get("Reply-To", "")
        auth_results = headers.get("Authentication-Results", "spf=none; dkim=none")
        date_str = headers.get("Date")

        date = datetime.now(timezone.utc)
        try:
            if date_str:
                from email.utils import parsedate_to_datetime

                dt = parsedate_to_datetime(date_str)
                if dt:
                    date = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass

        body_text = ""
        body_html = ""
        attachments: list[ParsedAttachment] = []

        def _extract_parts(part: dict[str, Any]):
            nonlocal body_text, body_html
            filename = part.get("filename", "")
            mime_type = part.get("mimeType", "text/plain")
            part_body = part.get("body", {})

            if filename:
                size = part_body.get("size", 0)
                attachments.append(
                    ParsedAttachment(
                        filename=filename, content_type=mime_type, size=size
                    )
                )
            else:
                data = part_body.get("data")
                if data and mime_type in ["text/plain", "text/html"]:
                    decoded = _decode_base64url(data)
                    if mime_type == "text/plain":
                        body_text += decoded
                    elif mime_type == "text/html":
                        body_html += decoded

            for sub in part.get("parts", []):
                _extract_parts(sub)

        if payload.get("parts"):
            for p in payload["parts"]:
                _extract_parts(p)
        elif payload.get("body", {}).get("data"):
            mime_type = payload.get("mimeType", "text/plain")
            decoded = _decode_base64url(payload["body"]["data"])
            if mime_type == "text/html":
                body_html = decoded
            else:
                body_text = decoded

        spf = (
            "spf=pass"
            if "spf=pass" in auth_results.lower()
            else ("spf=fail" if "spf=" in auth_results.lower() else None)
        )
        dkim = (
            "dkim=pass"
            if "dkim=pass" in auth_results.lower()
            else ("dkim=fail" if "dkim=" in auth_results.lower() else None)
        )
        dmarc = (
            "dmarc=pass"
            if "dmarc=pass" in auth_results.lower()
            else ("dmarc=" in auth_results.lower() and "dmarc=fail" or None)
        )

        parsed = ParsedEmail(
            sender=sender,
            recipient=recipient,
            subject=subject,
            date=date,
            message_id=message_id,
            reply_to=reply_to,
            spf=spf,
            dkim=dkim,
            dmarc=dmarc,
            body_text=body_text or ("(Empty Body)" if not body_html else ""),
            body_html=body_html,
            urls=extract_urls((body_text or "") + " " + (body_html or "")),
            attachments=attachments,
            raw_headers=headers,
        )
        return GmailMessage(message_id=msg_id, parsed=parsed, mailbox=mailbox)

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
                    ParsedAttachment(
                        "bonus_Q3.pdf.exe", "application/octet-stream", 204800
                    ),
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
                "Date": datetime.now(timezone.utc).strftime(
                    "%a, %d %b %Y %H:%M:%S +0000"
                ),
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

            messages.append(
                GmailMessage(
                    message_id=msg_id, parsed=parsed, mailbox=mailbox
                )
            )

        return messages
