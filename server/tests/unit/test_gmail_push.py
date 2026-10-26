"""
The push endpoint is public, so its refusals are the feature.

Anything that could make this act without a Google-signed token would be a way
to drive the gateway's fetching from outside. These tests pin the refusals
first, then the incremental-sync behaviour that makes push worth having: a
cursor that advances, and a cursor that has aged out being recognised rather
than silently fetching nothing.
"""

import base64
import json
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.api.gmail_push import _decode_notification, _verify_push_token
from app.core.config import Settings
from app.services.mailbox_sync import MailboxSyncService


def _envelope(address="victim@example.invalid", history_id="4242"):
    payload = json.dumps({"emailAddress": address, "historyId": history_id})
    return {"message": {"data": base64.urlsafe_b64encode(payload.encode()).decode()}}


class TestNotificationDecoding:
    def test_reads_address_and_cursor(self):
        assert _decode_notification(_envelope()) == ("victim@example.invalid", "4242")

    def test_rejects_envelope_with_no_data(self):
        assert _decode_notification({"message": {}}) is None
        assert _decode_notification({}) is None

    def test_rejects_undecodable_payload(self):
        assert _decode_notification({"message": {"data": "!!!not base64!!!"}}) is None

    def test_rejects_payload_that_is_not_json(self):
        data = base64.urlsafe_b64encode(b"plain text").decode()
        assert _decode_notification({"message": {"data": data}}) is None

    def test_rejects_payload_missing_a_field(self):
        for payload in ({"emailAddress": "a@b.c"}, {"historyId": "1"}):
            data = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
            assert _decode_notification({"message": {"data": data}}) is None


@pytest.mark.asyncio
class TestPushVerification:
    async def test_no_authorization_header_is_refused(self):
        with pytest.raises(HTTPException) as exc:
            await _verify_push_token(None)
        assert exc.value.status_code == 403

    async def test_non_bearer_authorization_is_refused(self):
        with pytest.raises(HTTPException) as exc:
            await _verify_push_token("Basic abc123")
        assert exc.value.status_code == 403

    async def test_unconfigured_verification_refuses_rather_than_trusts(self, monkeypatch):
        """
        The dangerous default would be to accept notifications because there was
        nothing configured to check them against.
        """
        from app.api import gmail_push

        monkeypatch.setattr(
            gmail_push, "get_settings", lambda: Settings(
                GMAIL_PUSH_AUDIENCE="", GMAIL_PUSH_SERVICE_ACCOUNT=""
            )
        )
        with pytest.raises(HTTPException) as exc:
            await _verify_push_token("Bearer anything")
        assert exc.value.status_code == 403


# ----------------------------------------------------------------------
# Incremental sync
# ----------------------------------------------------------------------


class _FakeGmail:
    """Records what was asked of it; answers from a script."""

    def __init__(self, history=None, stale=False, newest=None, profile_id="999"):
        self._history = history or []
        self._stale = stale
        self._newest = newest or []
        self._profile_id = profile_id
        self.history_calls: list[str] = []
        self.newest_calls = 0
        self.watch_calls = 0

    async def fetch_history(self, token, start_history_id, mailbox="inbox"):
        self.history_calls.append(start_history_id)
        if self._stale:
            return [], None, True
        return list(self._history), "5000", False

    async def fetch_messages(self, user, token, mailbox, max_results, db, since=None):
        self.newest_calls += 1
        self.since = since
        return list(self._newest)

    async def current_history_id(self, token):
        return self._profile_id

    async def watch(self, token, topic):
        self.watch_calls += 1
        return {
            "historyId": "7000",
            "expiration": str(
                int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp() * 1000)
            ),
        }


class _Db:
    def __init__(self):
        self.added = []

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        return None

    async def flush(self):
        return None


class _User:
    def __init__(self, history_id=None, expires=None):
        self.id = "user-1"
        self.email = "victim@example.invalid"
        self.google_access_token = "token"
        self.gmail_history_id = history_id
        self.gmail_watch_expires_at = expires


def _sync(gmail):
    service = MailboxSyncService(gmail_service=gmail)

    async def _no_scan(db, user, messages):
        return len(messages)

    service.scan_messages = _no_scan
    return service


@pytest.mark.asyncio
class TestIncrementalSync:
    async def test_first_sync_establishes_a_cursor(self):
        """Without a cursor there is nothing to resume from, so one is created."""
        gmail = _FakeGmail(newest=["m1", "m2"], profile_id="123")
        user = _User(history_id=None)

        outcome = await _sync(gmail).sync_user(_Db(), user)

        assert gmail.newest_calls == 1
        assert gmail.history_calls == []
        assert user.gmail_history_id == "123"
        assert outcome.fetched == 2

    async def test_later_sync_resumes_from_the_cursor(self):
        gmail = _FakeGmail(history=["m3"])
        user = _User(history_id="123")

        outcome = await _sync(gmail).sync_user(_Db(), user)

        # Incremental: it asked for changes since 123 and never re-read newest-N.
        assert gmail.history_calls == ["123"]
        assert gmail.newest_calls == 0
        assert user.gmail_history_id == "5000"
        assert outcome.fetched == 1
        assert outcome.resynchronised is False

    async def test_aged_out_cursor_resynchronises_and_says_so(self):
        """
        Gmail keeps about a week of history. A gateway down longer than that
        must notice, because the mail behind the window is not recoverable and
        silently fetching nothing would look identical to a quiet mailbox.
        """
        gmail = _FakeGmail(stale=True, newest=["m9"], profile_id="888")
        user = _User(history_id="1")

        outcome = await _sync(gmail).sync_user(_Db(), user)

        assert outcome.resynchronised is True
        assert gmail.newest_calls == 1
        assert user.gmail_history_id == "888"

    async def test_no_token_does_no_work(self):
        gmail = _FakeGmail()
        user = _User(history_id="123")
        user.google_access_token = None

        outcome = await _sync(gmail).sync_user(_Db(), user)

        assert outcome.fetched == 0
        assert gmail.history_calls == []


@pytest.mark.asyncio
class TestWatchUpkeep:
    async def test_watch_is_not_registered_when_push_is_off(self, monkeypatch):
        from app.services import mailbox_sync

        monkeypatch.setattr(
            mailbox_sync, "get_settings", lambda: Settings(GMAIL_PUSH_ENABLED=False)
        )
        gmail = _FakeGmail()
        assert await _sync(gmail).ensure_watch(_Db(), _User()) is False
        assert gmail.watch_calls == 0

    async def test_watch_is_registered_when_absent(self, monkeypatch):
        from app.services import mailbox_sync

        monkeypatch.setattr(
            mailbox_sync,
            "get_settings",
            lambda: Settings(
                GMAIL_PUSH_ENABLED=True,
                GMAIL_PUBSUB_TOPIC="projects/p/topics/t",
            ),
        )
        gmail = _FakeGmail()
        user = _User()

        assert await _sync(gmail).ensure_watch(_Db(), user) is True
        assert gmail.watch_calls == 1
        assert user.gmail_watch_expires_at is not None

    async def test_a_live_watch_is_not_renewed(self, monkeypatch):
        from app.services import mailbox_sync

        monkeypatch.setattr(
            mailbox_sync,
            "get_settings",
            lambda: Settings(
                GMAIL_PUSH_ENABLED=True,
                GMAIL_PUBSUB_TOPIC="projects/p/topics/t",
                WATCH_RENEW_INTERVAL_SECONDS=86400,
            ),
        )
        gmail = _FakeGmail()
        user = _User(expires=datetime.now(timezone.utc) + timedelta(days=6))

        assert await _sync(gmail).ensure_watch(_Db(), user) is True
        assert gmail.watch_calls == 0

    async def test_renewal_does_not_overwrite_a_live_cursor(self, monkeypatch):
        """
        The watch response carries a cursor. Taking it over an existing one
        would skip whatever arrived between the last sync and the renewal.
        """
        from app.services import mailbox_sync

        monkeypatch.setattr(
            mailbox_sync,
            "get_settings",
            lambda: Settings(
                GMAIL_PUSH_ENABLED=True,
                GMAIL_PUBSUB_TOPIC="projects/p/topics/t",
            ),
        )
        gmail = _FakeGmail()
        user = _User(history_id="123")

        await _sync(gmail).ensure_watch(_Db(), user)

        assert user.gmail_history_id == "123"
