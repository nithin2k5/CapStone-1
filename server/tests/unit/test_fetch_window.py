"""
Reads of the newest messages start at midnight today.

Mail from earlier days is erased once scanned, so a first sync or a Sync Now
that took the newest hundred regardless of age spent model calls on mail
nobody keeps. These tests pin the window on both providers' requests, and on
every caller that reads the newest messages.
"""

from datetime import datetime, timezone

import httpx
import pytest

from app.core.config import Settings
from app.services import gmail_service as gmail_module
from app.services import microsoft_service as microsoft_module
from app.services import retention_service
from app.services.gmail_service import GmailService
from app.services.microsoft_service import MicrosoftService
from app.services.retention_service import fetch_window_start

SINCE = datetime(2026, 10, 26, 0, 0, tzinfo=timezone.utc)


def _capture(monkeypatch, module, response):
    real = httpx.AsyncClient
    seen: list[httpx.Request] = []

    def client(*args, **kwargs):
        def handler(request):
            seen.append(request)
            return response

        kwargs["transport"] = httpx.MockTransport(handler)
        return real(*args, **kwargs)

    monkeypatch.setattr(module.httpx, "AsyncClient", client)
    return seen


class TestWindow:
    def test_it_starts_at_local_midnight_today(self, monkeypatch):
        monkeypatch.setattr(retention_service, "get_settings", lambda: Settings(FETCH_TODAY_ONLY=True))

        start = fetch_window_start()
        now = datetime.now().astimezone()

        assert start.date() == now.date()
        assert (start.hour, start.minute, start.second) == (0, 0, 0)
        assert start.tzinfo is not None
        assert start <= now

    def test_it_can_be_switched_off(self, monkeypatch):
        monkeypatch.setattr(retention_service, "get_settings", lambda: Settings(FETCH_TODAY_ONLY=False))
        assert fetch_window_start() is None


@pytest.mark.asyncio
class TestProviderRequests:
    async def test_gmail_asks_for_mail_after_the_window_in_epoch_seconds(self, monkeypatch):
        """A bare date would be read as midnight Pacific time."""
        seen = _capture(monkeypatch, gmail_module, httpx.Response(200, json={}))
        service = GmailService()
        monkeypatch.setattr(service, "is_configured", lambda: True)

        await service.fetch_messages(None, "t", "inbox", 100, since=SINCE)

        assert seen[0].url.params["q"] == f"in:inbox after:{int(SINCE.timestamp())}"
        assert seen[0].url.params["maxResults"] == "100"

    async def test_gmail_without_a_window_is_unchanged(self, monkeypatch):
        seen = _capture(monkeypatch, gmail_module, httpx.Response(200, json={}))
        service = GmailService()
        monkeypatch.setattr(service, "is_configured", lambda: True)

        await service.fetch_messages(None, "t", "inbox", 20)

        assert seen[0].url.params["q"] == "in:inbox"

    async def test_outlook_filters_and_orders_by_received_time(self, monkeypatch):
        seen = _capture(monkeypatch, microsoft_module, httpx.Response(200, json={"value": []}))
        service = MicrosoftService()
        monkeypatch.setattr(service, "is_configured", lambda: True)

        await service.fetch_messages(None, "t", "inbox", 100, since=SINCE)

        params = seen[0].url.params
        assert params["$filter"] == "receivedDateTime ge 2026-10-26T00:00:00Z"
        assert params["$orderby"] == "receivedDateTime desc"
        assert params["$top"] == "100"

    async def test_outlook_without_a_window_is_unfiltered(self, monkeypatch):
        seen = _capture(monkeypatch, microsoft_module, httpx.Response(200, json={"value": []}))
        service = MicrosoftService()
        monkeypatch.setattr(service, "is_configured", lambda: True)

        await service.fetch_messages(None, "t", "inbox", 20)

        assert "$filter" not in seen[0].url.params


@pytest.mark.asyncio
class TestCallersPassTheWindow:
    async def test_gmail_first_sync(self, monkeypatch):
        from app.services import mailbox_sync
        from tests.unit.test_gmail_push import _Db, _FakeGmail, _sync, _User

        monkeypatch.setattr(mailbox_sync, "fetch_window_start", lambda: SINCE)
        gmail = _FakeGmail(newest=["m1"])

        await _sync(gmail).sync_user(_Db(), _User(history_id=None))

        assert gmail.since == SINCE

    async def test_outlook_first_sync(self, monkeypatch):
        from app.services import outlook_sync
        from tests.unit.test_outlook import _Db, _FakeOutlook, _outlook_sync, _OutlookUser

        monkeypatch.setattr(outlook_sync, "fetch_window_start", lambda: SINCE)
        outlook = _FakeOutlook(newest=["n1"])

        await _outlook_sync(monkeypatch, outlook).sync_user(_Db(), _OutlookUser())

        assert outlook.since == SINCE
