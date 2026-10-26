"""
Outlook mailboxes get the same enforcement, sync and push as Gmail ones.

Each of these was missing or simulated: trash and release returned True without
calling Graph, nothing synchronised an Outlook mailbox in the background, and
nothing listened for new mail. A gateway that reports an action it did not take
is worse than one that reports nothing, so these tests pin what is actually sent.
"""

import httpx
import pytest

from app.services import microsoft_service as microsoft_module
from app.services.mailbox_tokens import AccessTokenRejected
from app.services.microsoft_service import MicrosoftService


def _graph(monkeypatch, handler):
    """Route the service's HTTP client to `handler`, recording every request."""
    real = httpx.AsyncClient
    seen: list[httpx.Request] = []

    def client(*args, **kwargs):
        def recording(request):
            seen.append(request)
            return handler(request)

        kwargs["transport"] = httpx.MockTransport(recording)
        return real(*args, **kwargs)

    monkeypatch.setattr(microsoft_module.httpx, "AsyncClient", client)
    return seen


def _moves(seen):
    return [
        (r.url.path.split("/")[-2], r.read().decode())
        for r in seen
        if r.method == "POST" and r.url.path.endswith("/move")
    ]


@pytest.mark.asyncio
class TestOutlookEnforcement:
    @pytest.mark.parametrize(
        "labels, folder",
        [(["TRASH"], "deleteditems"), (["SPAM"], "junkemail")],
    )
    async def test_each_verdict_moves_to_its_folder(self, monkeypatch, labels, folder):
        seen = _graph(monkeypatch, lambda request: httpx.Response(201, json={}))

        moved = await MicrosoftService().modify_message_labels("t", "m1", labels, ["INBOX"])

        assert moved is True
        assert _moves(seen) == [("m1", f'{{"destinationId":"{folder}"}}')]

    async def test_release_from_junk_moves_back_to_the_inbox(self, monkeypatch):
        def handler(request):
            if request.url.path.endswith("/mailFolders/inbox"):
                return httpx.Response(200, json={"id": "INBOX-ID"})
            if request.method == "GET":
                return httpx.Response(200, json={"parentFolderId": "JUNK-ID"})
            return httpx.Response(201, json={})

        seen = _graph(monkeypatch, handler)

        assert await MicrosoftService().modify_message_labels("t", "m1", ["INBOX"], []) is True
        assert _moves(seen) == [("m1", '{"destinationId":"inbox"}')]

    async def test_safe_mail_already_in_the_inbox_is_not_moved(self, monkeypatch):
        def handler(request):
            if request.url.path.endswith("/mailFolders/inbox"):
                return httpx.Response(200, json={"id": "INBOX-ID"})
            if request.method == "GET":
                return httpx.Response(200, json={"parentFolderId": "INBOX-ID"})
            return httpx.Response(201, json={})

        seen = _graph(monkeypatch, handler)

        assert await MicrosoftService().modify_message_labels("t", "m1", ["INBOX"], []) is True
        assert _moves(seen) == []

    async def test_a_refused_move_is_reported_not_assumed(self, monkeypatch):
        _graph(monkeypatch, lambda request: httpx.Response(404, json={}))
        assert await MicrosoftService().modify_message_labels("t", "m1", ["TRASH"], []) is False

    async def test_an_expired_token_is_signalled(self, monkeypatch):
        _graph(monkeypatch, lambda request: httpx.Response(401))
        with pytest.raises(AccessTokenRejected):
            await MicrosoftService().modify_message_labels("t", "m1", ["TRASH"], [])

    async def test_unmapped_labels_are_not_reported_as_done(self, monkeypatch):
        seen = _graph(monkeypatch, lambda request: httpx.Response(201, json={}))
        assert await MicrosoftService().modify_message_labels("t", "m1", ["STARRED"], []) is False
        assert seen == []

    async def test_ids_stay_valid_across_folder_moves(self, monkeypatch):
        """Without ImmutableId the id stored at scan time stops naming the message."""
        seen = _graph(monkeypatch, lambda request: httpx.Response(201, json={}))

        await MicrosoftService().modify_message_labels("t", "m1", ["SPAM"], [])

        assert all(r.headers["Prefer"] == 'IdType="ImmutableId"' for r in seen)
