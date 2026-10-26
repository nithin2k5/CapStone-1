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


# ----------------------------------------------------------------------
# Delta queries against Graph
# ----------------------------------------------------------------------

DELTA = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta"


@pytest.mark.asyncio
class TestDelta:
    async def test_pages_are_followed_and_removals_skipped(self, monkeypatch):
        def handler(request):
            if "page=2" in str(request.url):
                return httpx.Response(
                    200,
                    json={
                        "value": [{"id": "m3"}, {"id": "m4", "@removed": {"reason": "deleted"}}],
                        "@odata.deltaLink": f"{DELTA}?token=next",
                    },
                )
            return httpx.Response(
                200,
                json={"value": [{"id": "m1"}, {"id": "m2"}], "@odata.nextLink": f"{DELTA}?page=2"},
            )

        _graph(monkeypatch, handler)

        ids, link, stale = await MicrosoftService().delta("t", f"{DELTA}?token=prev")

        assert ids == ["m1", "m2", "m3"]
        assert link == f"{DELTA}?token=next"
        assert stale is False

    async def test_an_expired_delta_link_asks_for_a_resync(self, monkeypatch):
        """410 means start again, not nothing new."""
        _graph(monkeypatch, lambda request: httpx.Response(410))
        assert await MicrosoftService().delta("t", f"{DELTA}?token=old") == ([], None, True)

    async def test_delta_401_raises(self, monkeypatch):
        _graph(monkeypatch, lambda request: httpx.Response(401))
        with pytest.raises(AccessTokenRejected):
            await MicrosoftService().delta("t", None)

    async def test_a_message_deleted_before_fetch_is_skipped(self, monkeypatch):
        _graph(monkeypatch, lambda request: httpx.Response(404))
        assert await MicrosoftService().fetch_messages_by_id("t", ["gone"]) == []

    async def test_a_401_mid_batch_raises_rather_than_dropping_messages(self, monkeypatch):
        _graph(monkeypatch, lambda request: httpx.Response(401))
        with pytest.raises(AccessTokenRejected):
            await MicrosoftService().fetch_messages_by_id("t", ["m1"])


# ----------------------------------------------------------------------
# Background sync
# ----------------------------------------------------------------------

import asyncio  # noqa: E402
import uuid  # noqa: E402

from app.services import outlook_sync  # noqa: E402
from app.services.mailbox_tokens import GrantRevoked  # noqa: E402
from app.services.outlook_sync import OutlookSyncService  # noqa: E402


class _FakeOutlook:
    def __init__(self, delta_ids=None, stale=False, newest=None, valid="token"):
        self.delta_ids = delta_ids or []
        self.stale = stale
        self.newest = newest or []
        self.valid = valid
        self.renewal = {"access_token": "token", "expires_in": 3599}
        self.delta_calls: list[str | None] = []
        self.fetched_ids: list[list[str]] = []
        self.newest_calls = 0
        self.active = 0
        self.max_active = 0

    def _check(self, token):
        if token != self.valid:
            raise AccessTokenRejected()

    async def refresh_access_token(self, refresh_token):
        if self.renewal is GrantRevoked:
            raise GrantRevoked()
        return self.renewal

    async def delta(self, token, link):
        self._check(token)
        self.active += 1
        self.max_active = max(self.max_active, self.active)
        await asyncio.sleep(0)
        self.active -= 1
        self.delta_calls.append(link)
        if link is None:
            return ["whole-inbox-1", "whole-inbox-2"], "link-1", False
        if self.stale:
            return [], None, True
        return list(self.delta_ids), "link-2", False

    async def fetch_messages(self, user, token, mailbox, max_results, db=None):
        self._check(token)
        self.newest_calls += 1
        return list(self.newest)

    async def fetch_messages_by_id(self, token, ids, mailbox="inbox"):
        self._check(token)
        self.fetched_ids.append(list(ids))
        return list(ids)


class _OutlookUser:
    def __init__(self, delta_link=None):
        self.id = uuid.uuid4()
        self.google_access_token = None
        self.microsoft_access_token = "token"
        self.microsoft_refresh_token = "refresh"
        self.microsoft_token_expires_at = None
        self.microsoft_delta_link = delta_link


class _Db:
    def add(self, obj):
        pass

    async def commit(self):
        pass


def _outlook_sync(monkeypatch, outlook, stored=()):
    class _Repo:
        def __init__(self, db):
            pass

        async def get_by_gmail_id(self, message_id, user_id):
            return object() if message_id in stored else None

    monkeypatch.setattr(outlook_sync, "EmailRepository", _Repo)
    service = OutlookSyncService(microsoft_service=outlook, scan_service=object())

    async def _no_scan(db, user, messages):
        return len(messages)

    service._scanner.scan_messages = _no_scan
    return service


@pytest.mark.asyncio
class TestOutlookSync:
    async def test_first_sync_takes_a_link_then_reads_the_newest(self, monkeypatch):
        outlook = _FakeOutlook(newest=["n1", "n2"])
        user = _OutlookUser()

        outcome = await _outlook_sync(monkeypatch, outlook).sync_user(_Db(), user)

        assert outlook.delta_calls == [None]
        # The whole-inbox walk only establishes the link; it is not scanned.
        assert outlook.fetched_ids == []
        assert outcome.fetched == 2
        assert user.microsoft_delta_link == "link-1"

    async def test_later_sync_fetches_only_what_is_new(self, monkeypatch):
        """Delta repeats messages marked read; those are not fetched again."""
        outlook = _FakeOutlook(delta_ids=["old-read", "new-1"])
        user = _OutlookUser(delta_link="link-1")

        outcome = await _outlook_sync(monkeypatch, outlook, stored={"old-read"}).sync_user(
            _Db(), user
        )

        assert outlook.delta_calls == ["link-1"]
        assert outlook.fetched_ids == [["new-1"]]
        assert outlook.newest_calls == 0
        assert outcome.fetched == 1
        assert user.microsoft_delta_link == "link-2"

    async def test_nothing_new_fetches_nothing(self, monkeypatch):
        outlook = _FakeOutlook(delta_ids=["old"])
        user = _OutlookUser(delta_link="link-1")

        await _outlook_sync(monkeypatch, outlook, stored={"old"}).sync_user(_Db(), user)

        assert outlook.fetched_ids == []

    async def test_an_expired_link_resynchronises_and_says_so(self, monkeypatch):
        outlook = _FakeOutlook(stale=True, newest=["n1"])
        user = _OutlookUser(delta_link="ancient")

        outcome = await _outlook_sync(monkeypatch, outlook).sync_user(_Db(), user)

        assert outcome.resynchronised is True
        assert outlook.newest_calls == 1
        assert user.microsoft_delta_link == "link-1"

    async def test_an_expired_token_is_renewed_mid_sweep(self, monkeypatch):
        outlook = _FakeOutlook(delta_ids=["new-1"], valid="renewed")
        outlook.renewal = {"access_token": "renewed", "expires_in": 3599}
        user = _OutlookUser(delta_link="link-1")

        outcome = await _outlook_sync(monkeypatch, outlook).sync_user(_Db(), user)

        assert outcome.fetched == 1
        assert user.microsoft_access_token == "renewed"

    async def test_a_revoked_grant_is_reported_and_the_link_kept(self, monkeypatch):
        outlook = _FakeOutlook(valid="never")
        outlook.renewal = GrantRevoked
        user = _OutlookUser(delta_link="link-1")

        outcome = await _outlook_sync(monkeypatch, outlook).sync_user(_Db(), user)

        assert outcome.findings
        assert user.microsoft_delta_link == "link-1"

    async def test_concurrent_syncs_of_one_mailbox_take_turns(self, monkeypatch):
        """The sweep and a push notification must not scan the same delta twice."""
        outlook = _FakeOutlook(delta_ids=[])
        user = _OutlookUser(delta_link="link-1")
        service = _outlook_sync(monkeypatch, outlook)

        await asyncio.gather(service.sync_user(_Db(), user), service.sync_user(_Db(), user))

        assert outlook.max_active == 1


@pytest.mark.asyncio
class TestSweepIncludesOutlook:
    async def test_outlook_only_mailboxes_are_swept(self, monkeypatch):
        from app.core import scheduler

        gmail_user, outlook_user = object(), _OutlookUser()
        calls = []

        class _Session:
            async def __aenter__(self):
                return _Db()

            async def __aexit__(self, *exc):
                return False

        class _Gmail:
            async def ensure_watch(self, db, user):
                calls.append(("gmail-watch", user))

            async def sync_user(self, db, user, reason):
                calls.append(("gmail", user))

        class _Outlook:
            async def ensure_subscription(self, db, user):
                calls.append(("outlook-subscription", user))

            async def sync_user(self, db, user, reason):
                calls.append(("outlook", user))

        async def gmail_users(db):
            return [gmail_user]

        async def outlook_users(db):
            return [outlook_user]

        monkeypatch.setattr(scheduler, "AsyncSessionLocal", _Session)
        monkeypatch.setattr(scheduler, "MailboxSyncService", _Gmail)
        monkeypatch.setattr(scheduler, "OutlookSyncService", _Outlook)
        monkeypatch.setattr(scheduler, "_gmail_users", gmail_users)
        monkeypatch.setattr(scheduler, "_outlook_users", outlook_users)

        await scheduler.fetch_emails_job()

        assert ("gmail", gmail_user) in calls
        assert ("outlook", outlook_user) in calls
        assert ("outlook-subscription", outlook_user) in calls

    async def test_one_failing_mailbox_does_not_stop_the_others(self, monkeypatch):
        from app.core import scheduler

        class _RollbackDb(_Db):
            async def rollback(self):
                pass

        synced = []

        async def broken(db, user, reason):
            raise RuntimeError("provider down")

        async def working(db, user, reason):
            synced.append(user)

        first, second = _OutlookUser(), _OutlookUser()
        await scheduler._sync_one(_RollbackDb(), first, None, broken)
        await scheduler._sync_one(_RollbackDb(), second, None, working)

        assert synced == [second]


# ----------------------------------------------------------------------
# Push: subscription upkeep
# ----------------------------------------------------------------------

from datetime import datetime, timedelta, timezone  # noqa: E402

from app.core.config import Settings  # noqa: E402


class _Subscriptions(_FakeOutlook):
    def __init__(self, renew_ok=True):
        super().__init__()
        self.renew_ok = renew_ok
        self.created: list[dict] = []
        self.renewed: list[str] = []

    async def create_subscription(self, token, url, client_state, expires_at):
        self._check(token)
        self.created.append({"url": url, "state": client_state, "expires": expires_at})
        return {"id": f"sub-{len(self.created)}"}

    async def renew_subscription(self, token, subscription_id, expires_at):
        self._check(token)
        self.renewed.append(subscription_id)
        return {"id": subscription_id} if self.renew_ok else None


def _push_on(monkeypatch, enabled=True, url="https://gw.example/api/v1/microsoft/push"):
    monkeypatch.setattr(
        outlook_sync,
        "get_settings",
        lambda: Settings(MICROSOFT_PUSH_ENABLED=enabled, MICROSOFT_NOTIFICATION_URL=url),
    )


def _subscribed_user(expires_in):
    user = _OutlookUser(delta_link="link-1")
    user.microsoft_subscription_id = "sub-old"
    user.microsoft_client_state = "state-old"
    user.microsoft_subscription_expires_at = datetime.now(timezone.utc) + expires_in
    return user


def _fresh_user():
    user = _OutlookUser()
    user.microsoft_subscription_id = None
    user.microsoft_client_state = None
    user.microsoft_subscription_expires_at = None
    return user


@pytest.mark.asyncio
class TestSubscriptionUpkeep:
    async def test_nothing_is_subscribed_while_push_is_off(self, monkeypatch):
        _push_on(monkeypatch, enabled=False)
        graph = _Subscriptions()

        assert await _outlook_sync(monkeypatch, graph).ensure_subscription(_Db(), _fresh_user()) is False
        assert graph.created == []

    async def test_a_mailbox_without_one_is_subscribed_with_a_secret(self, monkeypatch):
        _push_on(monkeypatch)
        graph = _Subscriptions()
        user = _fresh_user()

        assert await _outlook_sync(monkeypatch, graph).ensure_subscription(_Db(), user) is True

        assert graph.created[0]["url"] == "https://gw.example/api/v1/microsoft/push"
        assert user.microsoft_subscription_id == "sub-1"
        # Long and random: it is the only thing proving a notification is genuine.
        assert user.microsoft_client_state == graph.created[0]["state"]
        assert len(user.microsoft_client_state) >= 32
        assert user.microsoft_subscription_expires_at > datetime.now(timezone.utc)

    async def test_a_live_subscription_is_left_alone(self, monkeypatch):
        _push_on(monkeypatch)
        graph = _Subscriptions()
        user = _subscribed_user(timedelta(days=1, hours=12))

        assert await _outlook_sync(monkeypatch, graph).ensure_subscription(_Db(), user) is True
        assert graph.renewed == [] and graph.created == []

    async def test_one_close_to_lapsing_is_renewed(self, monkeypatch):
        _push_on(monkeypatch)
        graph = _Subscriptions()
        user = _subscribed_user(timedelta(hours=6))

        assert await _outlook_sync(monkeypatch, graph).ensure_subscription(_Db(), user) is True
        assert graph.renewed == ["sub-old"]
        assert graph.created == []
        # Same subscription, same secret.
        assert user.microsoft_client_state == "state-old"
        assert user.microsoft_subscription_expires_at > datetime.now(timezone.utc) + timedelta(days=1)

    async def test_one_that_is_gone_is_replaced_with_a_new_secret(self, monkeypatch):
        _push_on(monkeypatch)
        graph = _Subscriptions(renew_ok=False)
        user = _subscribed_user(timedelta(hours=-1))

        assert await _outlook_sync(monkeypatch, graph).ensure_subscription(_Db(), user) is True
        assert user.microsoft_subscription_id == "sub-1"
        assert user.microsoft_client_state != "state-old"

    async def test_a_revoked_grant_is_not_subscribed(self, monkeypatch):
        _push_on(monkeypatch)
        graph = _Subscriptions()
        graph.valid = "never"
        graph.renewal = GrantRevoked

        assert await _outlook_sync(monkeypatch, graph).ensure_subscription(_Db(), _fresh_user()) is False


@pytest.mark.asyncio
class TestSubscriptionRequests:
    async def test_create_subscribes_to_new_inbox_mail(self, monkeypatch):
        import json

        seen = _graph(monkeypatch, lambda request: httpx.Response(201, json={"id": "s1"}))
        expires = datetime(2030, 1, 2, 3, 4, 5, tzinfo=timezone.utc)

        result = await MicrosoftService().create_subscription("t", "https://gw/push", "secret", expires)

        assert result == {"id": "s1"}
        body = json.loads(seen[0].read())
        assert body == {
            "changeType": "created",
            "notificationUrl": "https://gw/push",
            "resource": "me/mailFolders('Inbox')/messages",
            "expirationDateTime": "2030-01-02T03:04:05Z",
            "clientState": "secret",
        }

    async def test_a_missing_subscription_is_reported_for_replacement(self, monkeypatch):
        _graph(monkeypatch, lambda request: httpx.Response(404))
        expires = datetime.now(timezone.utc)
        assert await MicrosoftService().renew_subscription("t", "s1", expires) is None

    async def test_subscription_calls_signal_an_expired_token(self, monkeypatch):
        _graph(monkeypatch, lambda request: httpx.Response(401))
        expires = datetime.now(timezone.utc)
        with pytest.raises(AccessTokenRejected):
            await MicrosoftService().create_subscription("t", "u", "s", expires)
        with pytest.raises(AccessTokenRejected):
            await MicrosoftService().renew_subscription("t", "s1", expires)


# ----------------------------------------------------------------------
# Push: the public endpoint
# ----------------------------------------------------------------------

from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.api import microsoft_push  # noqa: E402
from app.main import app  # noqa: E402

PUSH = "/api/v1/microsoft/push"


def _holder(subscription_id="sub-1", state="the-secret"):
    user = _OutlookUser()
    user.microsoft_subscription_id = subscription_id
    user.microsoft_client_state = state
    return user


class _LookupDb:
    """Answers a subscription-id lookup from a fixed set of users."""

    def __init__(self, users):
        self.users = users

    async def execute(self, stmt):
        wanted = stmt.compile().params["microsoft_subscription_id_1"]
        match = next((u for u in self.users if u.microsoft_subscription_id == wanted), None)

        class _Result:
            def scalar_one_or_none(self):
                return match

        return _Result()


def _endpoint(monkeypatch, users, enabled=True):
    from app.api import microsoft_push as module

    monkeypatch.setattr(
        module, "get_settings", lambda: Settings(MICROSOFT_PUSH_ENABLED=enabled)
    )

    class _Session:
        async def __aenter__(self):
            return _LookupDb(users)

        async def __aexit__(self, *exc):
            return False

    synced: list = []

    async def record(user_id):
        synced.append(user_id)

    monkeypatch.setattr(module, "AsyncSessionLocal", _Session)
    monkeypatch.setattr(module, "_sync_mailbox", record)
    return synced


async def _post(**kwargs):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.post(PUSH, **kwargs)


@pytest.mark.asyncio
class TestPushEndpoint:
    async def test_subscription_validation_echoes_the_token_as_text(self, monkeypatch):
        _endpoint(monkeypatch, [])

        res = await _post(params={"validationToken": "abc 123"})

        assert res.status_code == 200
        assert res.text == "abc 123"
        assert res.headers["content-type"].startswith("text/plain")
        assert res.headers["x-content-type-options"] == "nosniff"

    async def test_an_oversized_validation_token_is_not_echoed(self, monkeypatch):
        _endpoint(monkeypatch, [])
        res = await _post(params={"validationToken": "x" * 5000})
        assert res.status_code == 400

    async def test_a_genuine_notification_syncs_that_mailbox(self, monkeypatch):
        user = _holder()
        synced = _endpoint(monkeypatch, [user])

        res = await _post(
            json={"value": [{"subscriptionId": "sub-1", "clientState": "the-secret"}]}
        )

        assert res.status_code == 202
        assert synced == [user.id]

    async def test_a_batch_for_one_mailbox_syncs_it_once(self, monkeypatch):
        user = _holder()
        synced = _endpoint(monkeypatch, [user])
        one = {"subscriptionId": "sub-1", "clientState": "the-secret"}

        await _post(json={"value": [one, one, one]})

        assert synced == [user.id]

    async def test_a_wrong_secret_is_acknowledged_but_ignored(self, monkeypatch):
        """Anyone can post here; only Graph knows the clientState."""
        synced = _endpoint(monkeypatch, [_holder()])

        res = await _post(json={"value": [{"subscriptionId": "sub-1", "clientState": "guess"}]})

        assert res.status_code == 202
        assert synced == []

    async def test_an_unknown_subscription_is_ignored(self, monkeypatch):
        synced = _endpoint(monkeypatch, [_holder()])
        await _post(json={"value": [{"subscriptionId": "sub-9", "clientState": "the-secret"}]})
        assert synced == []

    async def test_malformed_bodies_are_acknowledged_and_ignored(self, monkeypatch):
        synced = _endpoint(monkeypatch, [_holder()])
        for body in ({"content": b"not json"}, {"json": {"value": "x"}}, {"json": {"value": [1, None]}}):
            res = await _post(**body)
            assert res.status_code == 202
        assert synced == []

    async def test_notifications_are_ignored_while_push_is_off(self, monkeypatch):
        synced = _endpoint(monkeypatch, [_holder()], enabled=False)
        await _post(json={"value": [{"subscriptionId": "sub-1", "clientState": "the-secret"}]})
        assert synced == []
