"""
A Google grant without Gmail access is refused, not stored.

Google's consent screen lets the user untick Gmail and still sign in. The
token that results reads the profile and nothing else, so the account would
land on a dashboard that can neither fetch nor quarantine mail, and the
failure would only show later as an unrelated-looking fetch error.
"""

import httpx
import pytest
from fastapi import HTTPException

from app.api import auth as auth_module
from app.services import gmail_service as gmail_module
from app.services.gmail_service import GmailScopeMissing, GmailService

PROFILE_ONLY = "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"


class TestGrantedScope:
    def test_profile_only_grant_lacks_mailbox_access(self):
        assert not GmailService.grants_mailbox_access(PROFILE_ONLY)

    def test_readonly_grant_lacks_mailbox_access(self):
        """Readonly cannot relabel, so every quarantine would fail 403."""
        assert not GmailService.grants_mailbox_access(
            "https://www.googleapis.com/auth/gmail.readonly " + PROFILE_ONLY
        )

    def test_full_grant_has_mailbox_access(self):
        assert GmailService.grants_mailbox_access(" ".join(GmailService.SCOPES))

    def test_absent_scope_field_is_trusted(self):
        assert GmailService.grants_mailbox_access(None)


@pytest.mark.asyncio
class TestSignIn:
    async def test_sign_in_without_gmail_is_refused_before_anything_is_stored(self, monkeypatch):
        async def exchange(self, code, redirect_uri=None):
            return {"access_token": "t", "refresh_token": "r", "scope": PROFILE_ONLY}

        monkeypatch.setattr(GmailService, "exchange_code", exchange)

        # No database: reaching it would fail the test with an AttributeError.
        with pytest.raises(HTTPException) as caught:
            await auth_module._process_google_code("code", "postmessage", None)

        assert caught.value.status_code == 403
        assert caught.value.detail == GmailScopeMissing.MESSAGE


@pytest.mark.asyncio
class TestFetch:
    async def test_insufficient_scope_is_reported_as_such(self, monkeypatch):
        real = httpx.AsyncClient
        body = {"error": {"code": 403, "details": [{"reason": "ACCESS_TOKEN_SCOPE_INSUFFICIENT"}]}}

        def client(*args, **kwargs):
            kwargs["transport"] = httpx.MockTransport(lambda request: httpx.Response(403, json=body))
            return real(*args, **kwargs)

        monkeypatch.setattr(gmail_module.httpx, "AsyncClient", client)
        service = GmailService()
        monkeypatch.setattr(service, "is_configured", lambda: True)

        with pytest.raises(GmailScopeMissing):
            await service.fetch_messages(None, "t", "inbox", 10)
