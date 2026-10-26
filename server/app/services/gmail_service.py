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
from app.services.mailbox_tokens import AccessTokenRejected, GrantRevoked
from app.utils.email_parser import (
    ParsedAttachment,
    ParsedEmail,
    collect_headers,
    extract_auth,
    header_values,
    html_to_text,
    parse_email_content,
)

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

    # gmail.modify, not gmail.readonly. Enforcing a verdict means relabelling
    # the message, and readonly consent makes every quarantine and block fail
    # 403 while the verdict still lands in the database — a gateway that reports
    # what it would have done. modify subsumes readonly's access and stops short
    # of permanent deletion, which nothing here performs.
    SCOPES = [
        "https://www.googleapis.com/auth/gmail.modify",
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
            logger.warning("Google OAuth not configured.")
            raise ValueError("Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")

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

    async def refresh_access_token(self, refresh_token: str) -> dict[str, Any] | None:
        """
        Exchange a refresh token for a new access token.

        Returns the token endpoint's response, which carries the new token's
        lifetime as well as the token, or None on a transient failure. Raises
        GrantRevoked when Google refuses the refresh token itself.
        """
        if not self.is_configured():
            return None

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
                return res.json()
            logger.error(
                "Failed to refresh Google access token: %s - %s",
                res.status_code,
                res.text,
            )
            if res.status_code == 400 and "invalid_grant" in res.text:
                raise GrantRevoked()
            return None

    # ------------------------------------------------------------------
    # Push notifications.
    #
    # Polling leaves a message live in the inbox for the length of the poll
    # interval, which is the window an attacker needs — the user only has to
    # click once before the sweep arrives. A watch asks Gmail to publish a
    # notification the moment the mailbox changes, so the gap becomes the
    # round trip rather than the interval.
    # ------------------------------------------------------------------

    WATCH_LABELS = ["INBOX"]

    async def watch(self, access_token: str, topic: str) -> dict[str, Any] | None:
        """
        Ask Gmail to publish mailbox changes to a Pub/Sub topic.

        Returns the mailbox's current historyId and the watch expiry. A watch
        lapses after seven days, so the returned expiry is stored and renewed;
        a lapsed watch is silent, which is the failure mode worth avoiding.
        """
        url = "https://gmail.googleapis.com/gmail/v1/users/me/watch"
        body = {"topicName": topic, "labelIds": self.WATCH_LABELS}
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                url, headers={"Authorization": f"Bearer {access_token}"}, json=body
            )
            if res.status_code == 200:
                return res.json()
            if res.status_code == 401:
                raise AccessTokenRejected()
            logger.error(
                "Gmail watch registration failed: %s - %s", res.status_code, res.text
            )
            return None

    async def stop_watch(self, access_token: str) -> bool:
        """Cancel the watch. Used when a grant is revoked or a user disconnects."""
        url = "https://gmail.googleapis.com/gmail/v1/users/me/stop"
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                url, headers={"Authorization": f"Bearer {access_token}"}
            )
            if res.status_code in (200, 204):
                return True
            logger.warning(
                "Gmail watch stop failed: %s - %s", res.status_code, res.text
            )
            return False

    async def fetch_history(
        self,
        access_token: str,
        start_history_id: str,
        mailbox: str = "inbox",
    ) -> tuple[list[GmailMessage], str | None, bool]:
        """
        Fetch the messages added since `start_history_id`.

        Returns the messages, the mailbox's new historyId, and whether the
        cursor was too old to use. Gmail keeps roughly a week of history and
        answers 404 once a cursor falls outside it; that is not an error but an
        instruction to resynchronise, so it is reported as a flag rather than
        swallowed. Without it a gateway down for a long weekend would resume
        from a cursor Gmail no longer honours and quietly fetch nothing.
        """
        headers = {"Authorization": f"Bearer {access_token}"}
        added_ids: list[str] = []
        new_history_id: str | None = None
        page_token: str | None = None

        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                url = (
                    "https://gmail.googleapis.com/gmail/v1/users/me/history"
                    f"?startHistoryId={start_history_id}"
                    "&historyTypes=messageAdded"
                    f"&labelId={self.WATCH_LABELS[0]}"
                )
                if page_token:
                    url += f"&pageToken={page_token}"

                res = await client.get(url, headers=headers)
                if res.status_code == 404:
                    logger.warning(
                        "Gmail history cursor %s is no longer valid; a full "
                        "resynchronisation is required.",
                        start_history_id,
                    )
                    return [], None, True
                if res.status_code == 401:
                    raise AccessTokenRejected()
                if res.status_code != 200:
                    logger.error(
                        "Gmail history list failed: %s - %s", res.status_code, res.text
                    )
                    return [], None, False

                data = res.json()
                new_history_id = data.get("historyId") or new_history_id
                for record in data.get("history", []):
                    for added in record.get("messagesAdded", []):
                        message = added.get("message", {})
                        msg_id = message.get("id")
                        # A message can be added and removed within one history
                        # page, and the same id can appear in several records.
                        if msg_id and msg_id not in added_ids:
                            added_ids.append(msg_id)

                page_token = data.get("nextPageToken")
                if not page_token:
                    break

            messages = await self._fetch_details(client, headers, added_ids, mailbox)

        return messages, new_history_id, False

    async def current_history_id(self, access_token: str) -> str | None:
        """
        Read the mailbox's history cursor without fetching anything.

        Used to establish a starting point when a watch could not be registered,
        so the fallback poll still advances a cursor instead of re-reading the
        same newest-N messages forever.
        """
        url = "https://gmail.googleapis.com/gmail/v1/users/me/profile"
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                url, headers={"Authorization": f"Bearer {access_token}"}
            )
            if res.status_code == 200:
                return str(res.json().get("historyId") or "") or None
            if res.status_code == 401:
                raise AccessTokenRejected()
            logger.warning(
                "Gmail profile read failed: %s - %s", res.status_code, res.text
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

        url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/modify"
        headers = {"Authorization": f"Bearer {access_token}"}
        data = {"addLabelIds": add_labels, "removeLabelIds": remove_labels}
        
        async with httpx.AsyncClient() as client:
            res = await client.post(url, headers=headers, json=data)
            if res.status_code == 200:
                logger.info("Successfully modified labels for message %s", message_id)
                return True
            if res.status_code == 401:
                raise AccessTokenRejected()
            if res.status_code == 403:
                # A config error, not a bad run: the grant cannot label mail, so
                # every enforcement attempt for every user will fail until the
                # user re-consents to the scopes above.
                logger.error(
                    "Mailbox refused label change for message %s (%s): the OAuth "
                    "grant lacks gmail.modify. Re-consent required; no verdict "
                    "can be enforced until then. %s",
                    message_id,
                    res.status_code,
                    res.text,
                )
            else:
                logger.error(
                    "Failed to modify labels for message %s: %s - %s",
                    message_id,
                    res.status_code,
                    res.text,
                )
            return False

    # Gmail returns either the parsed structure or the original bytes, never
    # both, so the bytes DKIM needs are a second request. Capped because a
    # message with large attachments arrives whole in this form.
    MAX_RAW_BYTES = 10 * 1024 * 1024

    async def fetch_raw_message(
        self, client: httpx.AsyncClient, headers: dict, message_id: str
    ) -> bytes | None:
        """
        Retrieve a message exactly as it arrived, for signature verification.

        Returns None rather than raising: a message whose original bytes cannot
        be retrieved is simply one whose signature goes unchecked, and that must
        not fail the fetch.
        """
        url = (
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/"
            f"{message_id}?format=raw"
        )
        try:
            res = await client.get(url, headers=headers)
            if res.status_code != 200:
                logger.info(
                    "Raw message unavailable for id=%s (%s); DKIM will not be verified",
                    message_id,
                    res.status_code,
                )
                return None

            encoded = res.json().get("raw")
            if not encoded:
                return None

            padding = -len(encoded) % 4
            raw = base64.urlsafe_b64decode(encoded + "=" * padding)
            if len(raw) > self.MAX_RAW_BYTES:
                logger.info(
                    "Raw message for id=%s is %d bytes; skipping DKIM verification",
                    message_id,
                    len(raw),
                )
                return None
            return raw
        except Exception as e:
            logger.info(
                "Could not retrieve raw message for id=%s (%s: %s)",
                message_id,
                type(e).__name__,
                e,
            )
            return None

    async def fetch_messages(
        self,
        user: User | UUID,
        access_token: str | None = None,
        mailbox: str = "inbox",
        max_results: int = 20,
        db: AsyncSession | None = None,
        since: datetime | None = None,
    ) -> list[GmailMessage]:
        """
        Fetch the newest messages in a mailbox, received at or after `since` if given.

        Raises AccessTokenRejected when the token has expired; renewal is the
        caller's job, through MailboxTokens, so it happens the same way on every
        path rather than on this one alone.
        """
        user_id = user.id if isinstance(user, User) else user
        token = access_token or (
            user.google_access_token if isinstance(user, User) else None
        )

        if token and self.is_configured():
            try:
                messages = await self._fetch_from_gmail_api(token, mailbox, max_results, since)
                if messages is not None:
                    return messages
            except AccessTokenRejected:
                raise
            except Exception as e:
                logger.error("Error fetching live Gmail API messages: %s", e)

        logger.warning(
            "Failed to fetch live API messages for user=%s mailbox=%s. Token or configuration may be missing.", user_id, mailbox
        )
        raise ValueError("Unable to fetch emails: Token or configuration missing.")

    async def _fetch_from_gmail_api(
        self,
        access_token: str,
        mailbox: str,
        max_results: int,
        since: datetime | None = None,
    ) -> list[GmailMessage] | None:
        """Fetch messages via live Gmail REST API using httpx."""
        headers = {"Authorization": f"Bearer {access_token}"}
        query = "in:inbox" if mailbox.lower() == "inbox" else (f"label:{mailbox}" if mailbox == "PendingScan" else f"in:{mailbox}")
        if since is not None:
            # Epoch seconds, not a date: Gmail reads a bare date as midnight
            # Pacific time, whatever time zone the gateway runs in.
            query += f" after:{int(since.timestamp())}"
        list_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages"

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                list_url, headers=headers, params={"maxResults": max_results, "q": query}
            )
            if res.status_code == 401:
                raise AccessTokenRejected()

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

            return await self._fetch_details(
                client, headers, [item["id"] for item in message_summaries], mailbox
            )

    async def _fetch_details(
        self,
        client: httpx.AsyncClient,
        headers: dict[str, str],
        message_ids: list[str],
        mailbox: str,
    ) -> list[GmailMessage]:
        """
        Fetch and parse the named messages.

        Shared by the list path and the history path, so a message reached by a
        push notification is parsed exactly like one reached by a poll — same
        attachments, same raw bytes for DKIM. A divergence here would mean the
        faster path scored messages differently from the slower one.
        """
        messages: list[GmailMessage] = []
        for msg_id in message_ids:
            detail_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}?format=full"
            detail_res = await client.get(detail_url, headers=headers)
            if detail_res.status_code == 200:
                gmail_msg = self._parse_gmail_message_json(detail_res.json(), mailbox)
                if get_settings().dkim_verify_enabled:
                    gmail_msg.parsed.raw_message = await self.fetch_raw_message(
                        client, headers, msg_id
                    )
                messages.append(gmail_msg)
            elif detail_res.status_code == 401:
                # Raised rather than skipped: on the history path the cursor
                # advances past whatever this batch returns, so a message dropped
                # here would never be fetched again. The caller renews and retries
                # the whole batch.
                raise AccessTokenRejected()
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
        headers = collect_headers(
            (h.get("name", "").title(), h.get("value", "")) for h in headers_list
        )

        def header(name: str, default: str = "") -> str:
            values = header_values(headers, name)
            return values[-1] if values else default

        sender = header("From", "unknown@gmail.com")
        recipient = header("To", "user@company.com")
        subject = header("Subject", "(No Subject)")
        message_id = header("Message-Id", f"<{msg_id}@mail.gmail.com>")
        reply_to = header("Reply-To")
        auth_results = header("Authentication-Results")
        date_str = header("Date") or None

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

        # Report the verdict the provider actually gave. The previous mapping folded
        # every non-pass result into "fail", so a domain publishing no SPF record was
        # indistinguishable from one that failed authentication, and an absent
        # Authentication-Results header was reported as a failure it never was.
        spf = extract_auth(auth_results, "spf")
        dkim = extract_auth(auth_results, "dkim")
        dmarc = extract_auth(auth_results, "dmarc")

        # HTML-only messages carry no text/plain part. Deriving the text here is what
        # lets the content analysers see the body at all; leaving it blank silently
        # bypassed them for the majority of real mail.
        if not body_text.strip() and body_html:
            body_text = html_to_text(body_html)
            if body_text:
                logger.debug(
                    "Derived %d chars of body text from HTML for message %s",
                    len(body_text),
                    msg_id,
                )

        # Build through the parser rather than by hand. A hand-built ParsedEmail
        # carries no rendered body, so the perceptual analyser received None and
        # reported "no rendered body available" for every message fetched from
        # Gmail — concealed instructions went unscored on the primary ingest path.
        # It also left the Received chain and Return-Path empty, so the checks
        # that read them never fired.
        parsed = parse_email_content(headers, body_text, body_html, attachments)

        # Provider fields win for identity: Gmail resolves these more reliably
        # than the raw headers do.
        parsed.sender = sender
        parsed.recipient = recipient
        parsed.subject = subject
        parsed.date = date
        parsed.message_id = message_id
        parsed.reply_to = reply_to or parsed.reply_to
        parsed.spf = spf
        parsed.dkim = dkim
        parsed.dmarc = dmarc
        if not parsed.body_text:
            parsed.body_text = "(Empty Body)"
        return GmailMessage(message_id=msg_id, parsed=parsed, mailbox=mailbox)

