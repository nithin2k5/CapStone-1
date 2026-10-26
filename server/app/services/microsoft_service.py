import json
from typing import Any
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.mailbox_tokens import AccessTokenRejected, GrantRevoked

logger = get_logger("microsoft")

GRAPH = "https://graph.microsoft.com/v1.0"


def graph_headers(access_token: str) -> dict[str, str]:
    """
    Headers for every Graph mail call.

    ImmutableId, because Graph otherwise gives a message a new id whenever it
    changes folder. Quarantining an Outlook message moves it to Junk, so the id
    stored at scan time would stop naming it, and the later release or trash
    would act on nothing.
    """
    return {
        "Authorization": f"Bearer {access_token}",
        "Prefer": 'IdType="ImmutableId"',
    }

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

    # `body` is required, not just `bodyPreview`: the preview is truncated to a few
    # hundred characters, so analysing it means analysing an excerpt of the message.
    MESSAGE_FIELDS = (
        "id,subject,body,bodyPreview,from,toRecipients,receivedDateTime,"
        "internetMessageId,internetMessageHeaders,replyTo"
    )

    async def delta(
        self, access_token: str, delta_link: str | None
    ) -> tuple[list[str], str | None, bool]:
        """
        The ids of messages added to the inbox since `delta_link`.

        With no link, walks the whole inbox to establish one and returns its ids;
        the caller decides whether to use them. Returns the ids, the link to
        resume from next time, and whether the stored link had expired. Graph
        answers 410 for an expired sync state, which means "start again", not
        "nothing new" — reporting it as empty would look like a quiet mailbox.

        Only ids are selected: delta also reports read-state changes on old mail,
        and fetching full bodies for those on every sweep would be wasted calls.
        """
        url = delta_link or f"{GRAPH}/me/mailFolders/inbox/messages/delta?$select=id"
        headers = {**graph_headers(access_token), "Prefer": 'IdType="ImmutableId", odata.maxpagesize=100'}
        ids: list[str] = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            while url:
                res = await client.get(url, headers=headers)
                if res.status_code == 401:
                    raise AccessTokenRejected()
                if res.status_code == 410:
                    logger.warning("Outlook delta link expired; a full resynchronisation is required.")
                    return [], None, True
                if res.status_code != 200:
                    logger.error("Outlook delta failed: %s - %s", res.status_code, res.text)
                    return [], None, False

                data = res.json()
                for item in data.get("value", []):
                    # Deleted or moved out of the inbox since the last sync.
                    if "@removed" in item:
                        continue
                    if item.get("id") and item["id"] not in ids:
                        ids.append(item["id"])

                if data.get("@odata.deltaLink"):
                    return ids, data["@odata.deltaLink"], False
                url = data.get("@odata.nextLink")

        logger.error("Outlook delta ended without a delta link")
        return ids, None, False

    async def fetch_messages_by_id(
        self, access_token: str, message_ids: list[str], mailbox: str = "inbox"
    ) -> list[Any]:
        """
        Fetch and parse the named messages.

        A 401 part way through raises rather than skipping the rest: the delta
        link advances past whatever this returns, so a message dropped here would
        never be fetched again.
        """
        messages = []
        headers = graph_headers(access_token)
        async with httpx.AsyncClient(timeout=15.0) as client:
            for message_id in message_ids:
                res = await client.get(
                    f"{GRAPH}/me/messages/{message_id}?$select={self.MESSAGE_FIELDS}",
                    headers=headers,
                )
                if res.status_code == 200:
                    messages.append(self._parse_microsoft_message(res.json(), mailbox))
                elif res.status_code == 401:
                    raise AccessTokenRejected()
                else:
                    # Typically 404: deleted between the delta and this fetch.
                    logger.warning(
                        "Could not fetch Outlook message %s: %s", message_id, res.status_code
                    )
        return messages

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
        url = f"{GRAPH}/me/mailFolders/{folder_id}/messages?$top={max_results}&$select={self.MESSAGE_FIELDS}"
        
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=graph_headers(access_token))
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

    # Gmail label changes, as the quarantine service expresses them, mapped to
    # the Outlook folder that has the same effect.
    LABEL_FOLDERS = {"TRASH": "deleteditems", "SPAM": "junkemail", "INBOX": "inbox"}

    async def modify_message_labels(
        self,
        access_token: str,
        message_id: str,
        add_labels: list[str],
        remove_labels: list[str]
    ) -> bool:
        """
        Move the message to the folder the label change stands for.

        Only Junk used to be implemented. Trash and release returned True without
        calling Graph, so a blocked Outlook message was recorded as removed while
        it sat in the inbox, and a released one stayed in Junk.
        """
        folder = next(
            (self.LABEL_FOLDERS[label] for label in add_labels if label in self.LABEL_FOLDERS),
            None,
        )
        if folder is None:
            logger.error(
                "No Outlook folder corresponds to labels %s for message %s",
                add_labels,
                message_id,
            )
            return False

        headers = graph_headers(access_token)
        async with httpx.AsyncClient(timeout=15.0) as client:
            if folder == "inbox" and await self._already_in_inbox(client, headers, message_id):
                # Every message judged safe is "moved" to the inbox. For Gmail
                # that is an idempotent label; for Outlook it would be a real
                # move on every safe message, so it is skipped when there is
                # nothing to move.
                return True

            res = await client.post(
                f"{GRAPH}/me/messages/{message_id}/move",
                headers=headers,
                json={"destinationId": folder},
            )
            if res.status_code in (200, 201):
                logger.info("Moved Microsoft message %s to %s", message_id, folder)
                return True
            if res.status_code == 401:
                raise AccessTokenRejected()
            logger.error(
                "Failed to move Microsoft message %s to %s: %s - %s",
                message_id,
                folder,
                res.status_code,
                res.text,
            )
            return False

    async def _already_in_inbox(
        self, client: httpx.AsyncClient, headers: dict[str, str], message_id: str
    ) -> bool:
        inbox = await client.get(f"{GRAPH}/me/mailFolders/inbox?$select=id", headers=headers)
        message = await client.get(
            f"{GRAPH}/me/messages/{message_id}?$select=parentFolderId", headers=headers
        )
        if 401 in (inbox.status_code, message.status_code):
            raise AccessTokenRejected()
        if inbox.status_code != 200 or message.status_code != 200:
            # Unknown: attempt the move, which reports its own failure.
            return False
        return inbox.json().get("id") == message.json().get("parentFolderId")
