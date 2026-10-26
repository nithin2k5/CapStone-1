import json
from typing import Any
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.mailbox_tokens import AccessTokenRejected, GrantRevoked

logger = get_logger("microsoft")

class MicrosoftService:
    """
    Microsoft OAuth integration service.
    Exchanges OAuth2 codes for access/refresh tokens and fetches user profile.
    """

    SCOPES = [
        "openid",
        "email",
        "profile",
        "offline_access",
        "User.Read",
        "Mail.Read",
        "Mail.ReadWrite",
    ]

    def __init__(self) -> None:
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return bool(
            self.settings.microsoft_client_id
            and self.settings.microsoft_client_secret
        )

    def get_oauth_url(self, state: str = "default_state") -> str:
        """Generate Microsoft OAuth authorization URL."""
        base = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
        params = (
            f"client_id={self.settings.microsoft_client_id}"
            f"&redirect_uri={self.settings.microsoft_redirect_uri}"
            f"&response_type=code"
            f"&scope={'%20'.join(self.SCOPES)}"
            f"&prompt=select_account"
            f"&state={state}"
        )
        return f"{base}?{params}"

    async def exchange_code(
        self, code: str, redirect_uri: str | None = None
    ) -> dict[str, Any]:
        """Exchange authorization code for tokens via Microsoft's token endpoint."""
        if not self.is_configured():
            logger.warning("Microsoft OAuth not configured.")
            raise ValueError("Microsoft OAuth is not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.")

        url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
        data = {
            "client_id": self.settings.microsoft_client_id,
            "client_secret": self.settings.microsoft_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri or self.settings.microsoft_redirect_uri,
        }
        
        async with httpx.AsyncClient() as client:
            res = await client.post(url, data=data)
            if res.status_code != 200:
                logger.error(
                    "Failed to exchange Microsoft OAuth code: %s - %s",
                    res.status_code,
                    res.text,
                )
                return {"error": res.text}
            return res.json()

    async def refresh_access_token(self, refresh_token: str) -> dict[str, Any] | None:
        """
        Exchange a refresh token for a new access token.

        Returns the token endpoint's response, or None on a transient failure.
        Microsoft rotates refresh tokens, so the response usually carries a new
        one as well; MailboxTokens stores it. Raises GrantRevoked when the
        refresh token itself is refused.
        """
        if not self.is_configured():
            return None

        url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
        data = {
            "client_id": self.settings.microsoft_client_id,
            "client_secret": self.settings.microsoft_client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
            "scope": " ".join(self.SCOPES),
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, data=data)
            if res.status_code == 200:
                return res.json()
            logger.error(
                "Failed to refresh Microsoft access token: %s - %s",
                res.status_code,
                res.text,
            )
            if res.status_code == 400 and "invalid_grant" in res.text:
                raise GrantRevoked()
            return None

    async def get_user_info(self, access_token: str) -> dict[str, Any]:
        """Fetch user profile from Microsoft Graph API."""

        url = "https://graph.microsoft.com/v1.0/me"
        async with httpx.AsyncClient() as client:
            res = await client.get(
                url, headers={"Authorization": f"Bearer {access_token}"}
            )
            if res.status_code != 200:
                logger.error(
                    "Failed to get Microsoft userinfo: %s - %s",
                    res.status_code,
                    res.text,
                )
                return {}
            
            data = res.json()
            return {
                "email": data.get("mail") or data.get("userPrincipalName"),
                "name": data.get("displayName", "Microsoft User")
            }

    async def fetch_messages(
        self,
        user: Any,
        access_token: str | None = None,
        mailbox: str = "inbox",
        max_results: int = 20,
        db: Any = None,
    ) -> list[Any]:
        if not access_token or not self.is_configured():
            raise ValueError("Unable to fetch emails: Token or configuration missing.")

        folder_id = "inbox" if mailbox.lower() == "inbox" else mailbox
        # `body` is required, not just `bodyPreview`: the preview is truncated to a few
        # hundred characters, so analysing it means analysing an excerpt of the message.
        url = f"https://graph.microsoft.com/v1.0/me/mailFolders/{folder_id}/messages?$top={max_results}&$select=id,subject,body,bodyPreview,from,toRecipients,receivedDateTime,internetMessageId,internetMessageHeaders,replyTo"
        
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})
            if res.status_code == 401:
                raise AccessTokenRejected()
            if res.status_code != 200:
                logger.error("Failed to fetch Microsoft messages: %s", res.text)
                return []
            
            data = res.json()
            messages = []
            for item in data.get("value", []):
                messages.append(self._parse_microsoft_message(item, mailbox))
            return messages

    def _parse_microsoft_message(self, item: dict, mailbox: str) -> Any:
        from app.services.gmail_service import GmailMessage
        from app.utils.email_parser import (
            collect_headers,
            extract_urls,
            html_to_text,
            parse_email_content,
        )
        from datetime import datetime, timezone

        msg_id = item.get("id", "")
        subject = item.get("subject", "(No Subject)")
        body_preview = item.get("bodyPreview", "")

        body = item.get("body") or {}
        body_content = body.get("content", "") or ""
        is_html = (body.get("contentType") or "").lower() == "html"
        body_html = body_content if is_html else ""
        body_text = html_to_text(body_content) if is_html else body_content
        if not body_text.strip():
            body_text = body_preview

        from_email = "unknown@microsoft.com"
        if "from" in item and "emailAddress" in item["from"]:
            from_email = item["from"]["emailAddress"].get("address", from_email)
            
        recipient = "user@company.com"
        if item.get("toRecipients"):
            recip = item["toRecipients"][0]
            if "emailAddress" in recip:
                recipient = recip["emailAddress"].get("address", recipient)
                
        received_at_str = item.get("receivedDateTime")
        date = datetime.now(timezone.utc)
        if received_at_str:
            try:
                date = datetime.fromisoformat(received_at_str.replace('Z', '+00:00'))
            except Exception:
                pass

        message_id = item.get("internetMessageId", f"<{msg_id}@microsoft.com>")

        # Real MIME headers, when Graph returns them. Previously spf/dkim/dmarc were
        # hardcoded to "pass", so the header module scored every Outlook message 0 on
        # a 30%-weighted check it had never performed.
        headers = collect_headers(
            (header["name"], header.get("value", ""))
            for header in item.get("internetMessageHeaders") or []
            if header.get("name")
        )

        if not headers:
            logger.warning(
                "No internetMessageHeaders returned for message %s; sender "
                "authentication cannot be verified for this message",
                msg_id,
            )

        reply_to = ""
        for entry in item.get("replyTo") or []:
            address = (entry.get("emailAddress") or {}).get("address")
            if address:
                reply_to = address
                break

        # parse_email_content derives authentication results, Return-Path and the
        # Received chain from the headers; the structured Graph fields are more
        # reliable for identity, so they win where both exist.
        parsed = parse_email_content(headers, body_text, body_html)
        parsed.sender = from_email
        parsed.recipient = recipient
        parsed.subject = subject
        parsed.date = date
        parsed.message_id = message_id
        parsed.reply_to = reply_to or parsed.reply_to
        parsed.body_text = parsed.body_text or "(Empty Body)"
        parsed.urls = extract_urls(f"{parsed.body_text} {body_html}")

        return GmailMessage(message_id=msg_id, parsed=parsed, mailbox=mailbox)

    async def modify_message_labels(
        self,
        access_token: str,
        message_id: str,
        add_labels: list[str],
        remove_labels: list[str]
    ) -> bool:
        if "SPAM" in add_labels:
            url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/move"
            headers = {"Authorization": f"Bearer {access_token}"}
            data = {"destinationId": "junkemail"}
            
            async with httpx.AsyncClient() as client:
                res = await client.post(url, headers=headers, json=data)
                if res.status_code in [200, 201]:
                    logger.info("Successfully moved Microsoft message %s to Junk", message_id)
                    return True
                if res.status_code == 401:
                    raise AccessTokenRejected()
                logger.error("Failed to move Microsoft message %s: %s - %s", message_id, res.status_code, res.text)
                return False
        return True
