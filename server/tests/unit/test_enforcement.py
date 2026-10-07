"""
Enforcement is a separate fact from the verdict.

A mailbox can refuse the move that carries out a decision — an expired grant, a
scope the user never consented to, a provider outage. These tests pin that such
a refusal is recorded rather than discarded, because a message reported as
removed while it sits in the inbox is the one failure a gateway must not have.
"""

import uuid

import pytest

from app.database.models import Email, EmailStatus
from app.services.gmail_service import GmailService
from app.services.quarantine_service import QuarantineService


class _Mailbox:
    """A provider whose label changes all succeed, or all fail."""

    def __init__(self, succeeds: bool):
        self.succeeds = succeeds
        self.calls: list[dict] = []

    async def modify_message_labels(self, access_token, message_id, add_labels, remove_labels):
        self.calls.append({"add": add_labels, "remove": remove_labels})
        return self.succeeds


class _Db:
    """Enough AsyncSession for apply_quarantine: one user, and a no-op flush."""

    def __init__(self, user):
        self._user = user

    async def execute(self, _stmt):
        user = self._user

        class _Result:
            def scalar_one_or_none(self):
                return user

        return _Result()

    async def flush(self):
        return None


def _user(with_token=True):
    class _User:
        id = uuid.uuid4()
        google_access_token = "token" if with_token else None
        microsoft_access_token = None

    return _User()


def _email(user_id):
    return Email(
        id=uuid.uuid4(),
        user_id=user_id,
        gmail_message_id="msg-1",
        sender="attacker@example.invalid",
        recipient="victim@example.invalid",
        subject="Invoice",
    )


def _service(mailbox):
    return QuarantineService(gmail_service=mailbox, microsoft_service=mailbox)


@pytest.mark.asyncio
class TestEnforcementIsRecorded:
    async def test_block_the_mailbox_applied_is_enforced(self):
        user = _user()
        mailbox = _Mailbox(succeeds=True)
        email = _email(user.id)

        status = await _service(mailbox).apply_quarantine(_Db(user), email, 95.0)

        assert status is EmailStatus.BLOCKED
        assert email.enforced is True
        assert mailbox.calls == [{"add": ["TRASH"], "remove": ["INBOX", "PendingScan"]}]

    async def test_block_the_mailbox_refused_is_not_enforced(self):
        user = _user()
        email = _email(user.id)

        status = await _service(_Mailbox(succeeds=False)).apply_quarantine(_Db(user), email, 95.0)

        # The verdict stands — the gateway did judge the message. What changed is
        # that the row no longer claims the message was acted on.
        assert status is EmailStatus.BLOCKED
        assert email.enforced is False

    async def test_quarantine_the_mailbox_refused_is_not_enforced(self):
        user = _user()
        email = _email(user.id)

        status = await _service(_Mailbox(succeeds=False)).apply_quarantine(_Db(user), email, 70.0)

        assert status is EmailStatus.QUARANTINED
        assert email.enforced is False

    async def test_missing_token_is_not_enforced(self):
        """No grant at all is the same exposure as a refused one."""
        user = _user(with_token=False)
        mailbox = _Mailbox(succeeds=True)
        email = _email(user.id)

        await _service(mailbox).apply_quarantine(_Db(user), email, 95.0)

        assert email.enforced is False
        assert mailbox.calls == []

    async def test_safe_mail_records_enforcement_too(self):
        user = _user()
        email = _email(user.id)

        status = await _service(_Mailbox(succeeds=True)).apply_quarantine(_Db(user), email, 5.0)

        assert status is EmailStatus.SAFE
        assert email.enforced is True


class TestScopeCanEnforce:
    def test_gmail_grant_requests_label_write(self):
        """
        readonly consent makes every enforcement attempt fail 403. The scope list
        is the thing that decides whether this gateway can act at all, so it is
        asserted rather than assumed.
        """
        assert "https://www.googleapis.com/auth/gmail.modify" in GmailService.SCOPES
        assert "https://www.googleapis.com/auth/gmail.readonly" not in GmailService.SCOPES

    def test_oauth_url_carries_the_write_scope(self):
        url = GmailService().get_oauth_url()
        assert "gmail.modify" in url
