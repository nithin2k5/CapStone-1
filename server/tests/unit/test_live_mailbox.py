"""
The emails view lists the mailbox live from Gmail rather than the gateway's
rows. These tests pin what that listing asks Gmail for and how it reads the
answer: all received mail including SPAM and TRASH, where quarantined and
blocked mail ends up, and each row placed in the folder it sits in now.
"""

import httpx
import pytest

from app.services import gmail_service as gmail_module
from app.services.gmail_service import GmailService
from app.services.mailbox_tokens import AccessTokenRejected


def _mailbox(monkeypatch, listing, messages):
    real = httpx.AsyncClient
    seen: list[httpx.Request] = []

    def handler(request):
        seen.append(request)
        path = request.url.path
        if path.endswith("/messages"):
            return httpx.Response(200, json=listing)
        msg_id = path.rsplit("/", 1)[-1]
        if msg_id not in messages:
            return httpx.Response(404, json={})
        return httpx.Response(200, json=messages[msg_id])

    def client(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        return real(*args, **kwargs)

    monkeypatch.setattr(gmail_module.httpx, "AsyncClient", client)
    return seen


def _message(msg_id, labels, subject="Hello", internal="1793298600000"):
    return {
        "id": msg_id,
        "labelIds": labels,
        "internalDate": internal,
        "payload": {
            "headers": [
                {"name": "From", "value": "Alice <alice@example.com>"},
                {"name": "To", "value": "me@example.com"},
                {"name": "Subject", "value": subject},
            ]
        },
    }


@pytest.mark.asyncio
class TestListMailbox:
    async def test_it_asks_for_all_received_mail_including_spam_and_trash(self, monkeypatch):
        seen = _mailbox(monkeypatch, {"messages": []}, {})

        await GmailService().list_mailbox("t", page_token="p2", max_results=25, query="invoice")

        params = seen[0].url.params
        assert params["q"] == "-in:sent -in:drafts -in:chats invoice"
        assert params["includeSpamTrash"] == "true"
        assert params["pageToken"] == "p2"
        assert params["maxResults"] == "25"

    async def test_rows_carry_headers_and_the_folder_they_sit_in(self, monkeypatch):
        _mailbox(
            monkeypatch,
            {"messages": [{"id": "a"}, {"id": "b"}, {"id": "c"}], "nextPageToken": "n", "resultSizeEstimate": 120},
            {
                "a": _message("a", ["INBOX", "UNREAD"], subject="Invoice"),
                "b": _message("b", ["SPAM"]),
                "c": _message("c", ["CATEGORY_UPDATES"]),
            },
        )

        page = await GmailService().list_mailbox("t")

        assert [e.message_id for e in page.entries] == ["a", "b", "c"]
        assert [e.mailbox for e in page.entries] == ["inbox", "spam", "archive"]
        assert page.entries[0].subject == "Invoice"
        assert page.entries[0].sender == "Alice <alice@example.com>"
        assert int(page.entries[0].received_at.timestamp()) == 1793298600
        assert page.next_page_token == "n"
        assert page.total_estimate == 120

    async def test_a_message_gone_since_listing_is_skipped(self, monkeypatch):
        _mailbox(monkeypatch, {"messages": [{"id": "a"}, {"id": "gone"}]}, {"a": _message("a", ["INBOX"])})

        page = await GmailService().list_mailbox("t")

        assert [e.message_id for e in page.entries] == ["a"]

    async def test_an_expired_token_is_raised_for_renewal(self, monkeypatch):
        real = httpx.AsyncClient

        def client(*args, **kwargs):
            kwargs["transport"] = httpx.MockTransport(lambda r: httpx.Response(401, json={}))
            return real(*args, **kwargs)

        monkeypatch.setattr(gmail_module.httpx, "AsyncClient", client)
        with pytest.raises(AccessTokenRejected):
            await GmailService().list_mailbox("t")
