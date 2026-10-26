"""
A mailbox grant stays usable for as long as the user has not revoked it.

Access tokens last about an hour, and renewal used to happen on one fetch path
only, so the background sweep stopped scanning an hour after the user last
opened the app — while logging as though it were healthy. These tests pin that
every path renews: before a recorded expiry, after a rejection, and that a
grant which cannot be renewed is reported rather than retried forever.
"""

import uuid
from datetime import datetime, timedelta, timezone

import httpx
import pytest

from app.services import gmail_service as gmail_module
from app.services.gmail_service import GmailService
from app.services.mailbox_sync import MailboxSyncService
from app.services.mailbox_tokens import (
    AccessTokenRejected,
    GrantRevoked,
    MailboxTokens,
    MailboxUnavailable,
)
from app.services.quarantine_service import QuarantineService


class _User:
    def __init__(self, expires_at=None, refresh="refresh-1", history_id="100"):
        self.id = uuid.uuid4()
        self.email = "victim@example.invalid"
        self.google_access_token = "old"
        self.google_refresh_token = refresh
        self.google_token_expires_at = expires_at
        self.microsoft_access_token = None
        self.gmail_history_id = history_id
        self.gmail_watch_expires_at = None


class _Db:
    def __init__(self, user=None):
        self._user = user
        self.added = []

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        return None

    async def flush(self):
        return None

    async def execute(self, _stmt):
        user = self._user

        class _Result:
            def scalar_one_or_none(self):
                return user

        return _Result()


class _Google:
    """
    A provider that accepts only the token it most recently issued.

    `renewal` is what the token endpoint answers with: a response dict, None for
    a transient failure, or GrantRevoked.
    """

    def __init__(self, renewal=None, valid="old"):
        self.valid = valid
        self.renewal = (
            renewal
            if renewal is not None
            else {"access_token": "new", "expires_in": 3599}
        )
        self.refreshes: list[str] = []
        self.history_tokens: list[str] = []
        self.label_tokens: list[str] = []

    async def refresh_access_token(self, refresh_token):
        self.refreshes.append(refresh_token)
        if self.renewal is GrantRevoked:
            raise GrantRevoked()
        if self.renewal == "transient":
            return None
        self.valid = self.renewal["access_token"]
        return self.renewal

    def _check(self, token):
        if token != self.valid:
            raise AccessTokenRejected()

    async def fetch_history(self, token, start_history_id, mailbox="inbox"):
        self.history_tokens.append(token)
        self._check(token)
        return ["m1"], "200", False

    async def current_history_id(self, token):
        self._check(token)
        return "200"

    async def modify_message_labels(self, access_token, message_id, add_labels, remove_labels):
        self.label_tokens.append(access_token)
        self._check(access_token)
        return True


def _past():
    return datetime.now(timezone.utc) - timedelta(minutes=1)


def _future():
    return datetime.now(timezone.utc) + timedelta(hours=1)


@pytest.mark.asyncio
class TestRenewal:
    async def test_a_token_past_its_expiry_is_renewed_before_use(self):
        """The call never sees the dead token, so nothing is half-fetched."""
        google = _Google(valid="new")
        user = _User(expires_at=_past())

        result = await MailboxTokens(google).google(
            _Db(), user, lambda token: google.fetch_history(token, "100")
        )

        assert result[1] == "200"
        assert google.history_tokens == ["new"]
        assert user.google_access_token == "new"
        assert user.google_token_expires_at > datetime.now(timezone.utc)

    async def test_a_token_inside_the_renewal_margin_is_renewed(self):
        google = _Google(valid="new")
        user = _User(expires_at=datetime.now(timezone.utc) + timedelta(minutes=2))

        await MailboxTokens(google).google(
            _Db(), user, lambda token: google.fetch_history(token, "100")
        )

        assert google.refreshes == ["refresh-1"]

    async def test_a_fresh_token_is_used_as_it_is(self):
        google = _Google()
        user = _User(expires_at=_future())

        await MailboxTokens(google).google(
            _Db(), user, lambda token: google.fetch_history(token, "100")
        )

        assert google.refreshes == []
        assert google.history_tokens == ["old"]

    async def test_naive_expiry_from_sqlite_is_read_as_utc(self):
        google = _Google(valid="new")
        user = _User(expires_at=_past().replace(tzinfo=None))

        await MailboxTokens(google).google(
            _Db(), user, lambda token: google.fetch_history(token, "100")
        )

        assert google.refreshes == ["refresh-1"]

    async def test_a_rejected_token_with_unknown_expiry_is_renewed_and_retried(self):
        """Grants stored before expiry was recorded rely on this path."""
        google = _Google()
        google.valid = "not-old"  # the stored token has quietly expired
        google.renewal = {"access_token": "not-old", "expires_in": 3599}
        user = _User(expires_at=None)

        result = await MailboxTokens(google).google(
            _Db(), user, lambda token: google.fetch_history(token, "100")
        )

        assert result[0] == ["m1"]
        assert google.history_tokens == ["old", "not-old"]
        assert user.google_access_token == "not-old"
        # Recorded, so the next call renews ahead of time instead of failing first.
        assert user.google_token_expires_at is not None

    async def test_a_rotated_refresh_token_replaces_the_stored_one(self):
        google = _Google(
            renewal={"access_token": "new", "expires_in": 3599, "refresh_token": "refresh-2"},
            valid="new",
        )
        user = _User(expires_at=_past())

        await MailboxTokens(google).google(
            _Db(), user, lambda token: google.fetch_history(token, "100")
        )

        assert user.google_refresh_token == "refresh-2"

    async def test_a_token_refused_right_after_renewal_is_not_renewed_again(self):
        google = _Google()
        user = _User()

        async def always_refused(token):
            raise AccessTokenRejected()

        with pytest.raises(AccessTokenRejected):
            await MailboxTokens(google).google(_Db(), user, always_refused)
        assert len(google.refreshes) == 1


@pytest.mark.asyncio
class TestGrantsThatCannotBeRenewed:
    async def test_a_revoked_grant_is_cleared(self):
        """Left in place, the sweep would retry a dead credential every interval."""
        google = _Google(renewal=GrantRevoked)
        user = _User(expires_at=_past())

        with pytest.raises(MailboxUnavailable):
            # The proactive renewal fails, the stale token is tried, and once the
            # grant is cleared there is nothing left to retry with.
            await MailboxTokens(google).google(
                _Db(), user, lambda token: google.fetch_history(token, "100")
            )

        assert user.google_access_token is None
        assert user.google_refresh_token is None

    async def test_a_transient_failure_keeps_the_grant(self):
        google = _Google(renewal="transient")
        google.valid = "never"
        user = _User()

        with pytest.raises(MailboxUnavailable):
            await MailboxTokens(google).google(
                _Db(), user, lambda token: google.fetch_history(token, "100")
            )

        assert user.google_access_token == "old"
        assert user.google_refresh_token == "refresh-1"

    async def test_no_refresh_token_cannot_be_renewed(self):
        google = _Google()
        google.valid = "never"
        user = _User(refresh=None)

        with pytest.raises(MailboxUnavailable):
            await MailboxTokens(google).google(
                _Db(), user, lambda token: google.fetch_history(token, "100")
            )
        assert google.refreshes == []

    async def test_no_access_token_does_no_work(self):
        google = _Google()
        user = _User()
        user.google_access_token = None

        with pytest.raises(MailboxUnavailable):
            await MailboxTokens(google).google(
                _Db(), user, lambda token: google.fetch_history(token, "100")
            )
        assert google.history_tokens == []


@pytest.mark.asyncio
class TestEveryPathRenews:
    async def test_the_background_sync_survives_an_expired_token(self):
        """The failure this module exists for: incremental sync an hour later."""
        google = _Google()
        google.valid = "new"
        user = _User(history_id="100")
        sync = MailboxSyncService(gmail_service=google)

        async def _no_scan(db, user, messages):
            return len(messages)

        sync.scan_messages = _no_scan

        outcome = await sync.sync_user(_Db(), user)

        assert outcome.fetched == 1
        assert user.gmail_history_id == "200"
        assert user.google_access_token == "new"

    async def test_a_sync_that_cannot_renew_reports_it_instead_of_raising(self):
        google = _Google(renewal=GrantRevoked)
        google.valid = "never"
        user = _User(history_id="100")
        sync = MailboxSyncService(gmail_service=google)

        outcome = await sync.sync_user(_Db(), user)

        assert outcome.fetched == 0
        assert outcome.findings
        # The cursor stays put, so nothing behind it is skipped once reconnected.
        assert user.gmail_history_id == "100"

    async def test_quarantine_renews_rather_than_leaving_mail_in_place(self):
        google = _Google()
        google.valid = "new"
        user = _User()
        service = QuarantineService(gmail_service=google, microsoft_service=google)

        moved = await service.move_to_spam(_Db(user), user.id, "msg-1")

        assert moved is True
        assert google.label_tokens == ["old", "new"]

    async def test_quarantine_that_cannot_renew_is_recorded_as_not_enforced(self):
        google = _Google(renewal="transient")
        google.valid = "never"
        user = _User()
        service = QuarantineService(gmail_service=google, microsoft_service=google)

        assert await service.move_to_spam(_Db(user), user.id, "msg-1") is False


# ----------------------------------------------------------------------
# The Gmail client reports an expired token instead of swallowing it
# ----------------------------------------------------------------------


def _respond(monkeypatch, handler):
    real = httpx.AsyncClient

    def client(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        return real(*args, **kwargs)

    monkeypatch.setattr(gmail_module.httpx, "AsyncClient", client)


@pytest.mark.asyncio
class TestGmailClientSignalsExpiry:
    async def test_history_401_raises(self, monkeypatch):
        _respond(monkeypatch, lambda request: httpx.Response(401))
        with pytest.raises(AccessTokenRejected):
            await GmailService().fetch_history("old", "100")

    async def test_a_401_mid_batch_raises_rather_than_dropping_messages(self, monkeypatch):
        """The cursor would advance past a message skipped here."""

        def handler(request):
            if request.url.path.endswith("/history"):
                return httpx.Response(
                    200,
                    json={
                        "historyId": "200",
                        "history": [{"messagesAdded": [{"message": {"id": "m1"}}]}],
                    },
                )
            return httpx.Response(401)

        _respond(monkeypatch, handler)
        with pytest.raises(AccessTokenRejected):
            await GmailService().fetch_history("old", "100")

    async def test_label_change_401_raises(self, monkeypatch):
        _respond(monkeypatch, lambda request: httpx.Response(401))
        with pytest.raises(AccessTokenRejected):
            await GmailService().modify_message_labels("old", "m1", ["SPAM"], [])

    async def test_label_change_403_is_a_scope_problem_not_an_expiry(self, monkeypatch):
        """Renewing would not help: the grant lacks gmail.modify."""
        _respond(monkeypatch, lambda request: httpx.Response(403))
        assert await GmailService().modify_message_labels("old", "m1", ["SPAM"], []) is False

    async def test_watch_and_profile_401_raise(self, monkeypatch):
        _respond(monkeypatch, lambda request: httpx.Response(401))
        with pytest.raises(AccessTokenRejected):
            await GmailService().watch("old", "projects/p/topics/t")
        with pytest.raises(AccessTokenRejected):
            await GmailService().current_history_id("old")

    async def test_refused_refresh_token_raises_grant_revoked(self, monkeypatch):
        _respond(
            monkeypatch,
            lambda request: httpx.Response(400, text='{"error": "invalid_grant"}'),
        )
        service = GmailService()
        monkeypatch.setattr(service, "is_configured", lambda: True)
        with pytest.raises(GrantRevoked):
            await service.refresh_access_token("refresh-1")

    async def test_refresh_returns_the_lifetime_with_the_token(self, monkeypatch):
        _respond(
            monkeypatch,
            lambda request: httpx.Response(
                200, json={"access_token": "new", "expires_in": 3599}
            ),
        )
        service = GmailService()
        monkeypatch.setattr(service, "is_configured", lambda: True)
        assert await service.refresh_access_token("refresh-1") == {
            "access_token": "new",
            "expires_in": 3599,
        }


# ----------------------------------------------------------------------
# Outlook
# ----------------------------------------------------------------------


def _outlook_user():
    user = _User()
    user.google_access_token = None
    user.google_refresh_token = None
    user.microsoft_access_token = "old"
    user.microsoft_refresh_token = "ms-refresh-1"
    user.microsoft_token_expires_at = None
    return user


@pytest.mark.asyncio
class TestOutlookRenewal:
    async def test_an_outlook_quarantine_renews_an_expired_token(self):
        outlook = _Google(
            renewal={"access_token": "new", "expires_in": 3599, "refresh_token": "ms-refresh-2"},
        )
        outlook.valid = "new"
        user = _outlook_user()
        service = QuarantineService(gmail_service=_Google(), microsoft_service=outlook)

        moved = await service.move_to_spam(_Db(user), user.id, "msg-1")

        assert moved is True
        assert outlook.label_tokens == ["old", "new"]
        assert user.microsoft_access_token == "new"
        assert user.microsoft_token_expires_at is not None
        # Microsoft rotates refresh tokens; keeping the old one would eventually
        # leave the grant unrenewable.
        assert user.microsoft_refresh_token == "ms-refresh-2"

    async def test_a_revoked_outlook_grant_is_cleared_and_not_enforced(self):
        outlook = _Google(renewal=GrantRevoked)
        outlook.valid = "never"
        user = _outlook_user()
        service = QuarantineService(gmail_service=_Google(), microsoft_service=outlook)

        assert await service.move_to_spam(_Db(user), user.id, "msg-1") is False
        assert user.microsoft_access_token is None
        assert user.microsoft_refresh_token is None

    async def test_outlook_renewal_does_not_touch_the_google_grant(self):
        outlook = _Google(valid="new")
        user = _outlook_user()
        user.microsoft_token_expires_at = _past()

        await MailboxTokens(_Google(), outlook).microsoft(
            _Db(), user, lambda token: outlook.fetch_history(token, "1")
        )

        assert outlook.refreshes == ["ms-refresh-1"]
        assert user.google_access_token is None


def _respond_microsoft(monkeypatch, handler):
    from app.services import microsoft_service as microsoft_module

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


def _configured_microsoft(monkeypatch):
    from app.services.microsoft_service import MicrosoftService

    service = MicrosoftService()
    monkeypatch.setattr(service, "is_configured", lambda: True)
    return service


@pytest.mark.asyncio
class TestOutlookClientSignalsExpiry:
    async def test_fetch_401_raises(self, monkeypatch):
        _respond_microsoft(monkeypatch, lambda request: httpx.Response(401))
        with pytest.raises(AccessTokenRejected):
            await _configured_microsoft(monkeypatch).fetch_messages(None, "old")

    async def test_junk_move_401_raises(self, monkeypatch):
        _respond_microsoft(monkeypatch, lambda request: httpx.Response(401))
        with pytest.raises(AccessTokenRejected):
            await _configured_microsoft(monkeypatch).modify_message_labels(
                "old", "m1", ["SPAM"], []
            )

    async def test_refresh_asks_for_the_same_scopes_including_offline_access(self, monkeypatch):
        """Without offline_access in the request, no new refresh token comes back."""
        seen = _respond_microsoft(
            monkeypatch,
            lambda request: httpx.Response(
                200,
                json={"access_token": "new", "expires_in": 3599, "refresh_token": "r2"},
            ),
        )

        response = await _configured_microsoft(monkeypatch).refresh_access_token("r1")

        assert response["access_token"] == "new"
        body = seen[0].content.decode()
        assert "grant_type=refresh_token" in body
        assert "offline_access" in body

    async def test_refused_refresh_token_raises_grant_revoked(self, monkeypatch):
        _respond_microsoft(
            monkeypatch,
            lambda request: httpx.Response(400, text='{"error": "invalid_grant"}'),
        )
        with pytest.raises(GrantRevoked):
            await _configured_microsoft(monkeypatch).refresh_access_token("r1")
