import uuid

import pytest
from sqlalchemy import func, inspect, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database.models import Base, Email, User
from app.repositories.email_repository import EmailRepository
from app.services.gmail_service import GmailMessage
from app.utils.email_parser import ParsedEmail


def message(message_id: str) -> GmailMessage:
    return GmailMessage(
        message_id=message_id,
        parsed=ParsedEmail(
            sender="a@b.com", recipient="u@c.com", subject=message_id
        ),
        mailbox="inbox",
    )


@pytest.fixture
async def session_factory(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path}/test.sqlite3")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield async_sessionmaker(engine, expire_on_commit=False)

    await engine.dispose()


async def make_user(session_factory) -> uuid.UUID:
    user_id = uuid.uuid4()
    async with session_factory() as db:
        db.add(
            User(
                id=user_id,
                name="n",
                email=f"{user_id}@example.com",
                hashed_password="h",
            )
        )
        await db.commit()
    return user_id


class TestConcurrentFetchIsIsolated:
    """
    A message losing an insert race must cost only that message.

    The conflict handler used to roll the whole session back, discarding every
    email flushed earlier in the same fetch loop — one duplicate near the end of
    a batch threw away everything before it.
    """

    @staticmethod
    def _blind_lookup_once(repo: EmailRepository, message_id: str) -> None:
        """
        Reproduce the race the conflict handler exists for.

        The duplicate check passes because the competing insert has not landed
        yet, so the unique constraint is what rejects the row — the path that
        used to roll the whole session back.
        """
        real = repo.get_by_gmail_id
        missed = False

        async def lookup(candidate_id, user_id):
            nonlocal missed
            if candidate_id == message_id and not missed:
                missed = True
                return None
            return await real(candidate_id, user_id)

        repo.get_by_gmail_id = lookup

    async def test_earlier_emails_survive_a_duplicate(self, session_factory):
        user_id = await make_user(session_factory)

        async with session_factory() as db:
            await EmailRepository(db).create_from_gmail(user_id, message("stored"))
            await db.commit()

        async with session_factory() as db:
            repo = EmailRepository(db)
            for index in range(3):
                _, is_new = await repo.create_from_gmail(user_id, message(f"m{index}"))
                assert is_new

            self._blind_lookup_once(repo, "stored")
            _, is_new = await repo.create_from_gmail(user_id, message("stored"))
            assert is_new is False, "the conflicting insert was not recovered from"

            await db.commit()

        async with session_factory() as db:
            total = (await db.execute(select(func.count()).select_from(Email))).scalar()
            assert total == 4, "the conflict discarded emails flushed before it"


class TestMessageIdsAreScopedToTheUser:
    """
    A provider message id identifies a message within one mailbox.

    Enforced globally, the second user to receive a message whose id was already
    stored was handed the first user's row instead of getting their own.
    """

    async def test_two_users_can_hold_the_same_message_id(self, session_factory):
        first = await make_user(session_factory)
        second = await make_user(session_factory)

        async with session_factory() as db:
            repo = EmailRepository(db)
            first_email, first_new = await repo.create_from_gmail(first, message("shared"))
            second_email, second_new = await repo.create_from_gmail(second, message("shared"))
            await db.commit()

            assert first_new and second_new
            assert first_email.id != second_email.id
            assert first_email.user_id == first
            assert second_email.user_id == second

    async def test_lookup_does_not_cross_users(self, session_factory):
        first = await make_user(session_factory)
        second = await make_user(session_factory)

        async with session_factory() as db:
            repo = EmailRepository(db)
            await repo.create_from_gmail(first, message("shared"))
            await db.commit()

            assert await repo.get_by_gmail_id("shared", second) is None
            assert await repo.get_by_gmail_id("shared", first) is not None

    async def test_same_user_does_not_store_a_message_twice(self, session_factory):
        user_id = await make_user(session_factory)

        async with session_factory() as db:
            repo = EmailRepository(db)
            original, is_new = await repo.create_from_gmail(user_id, message("dup"))
            await db.commit()
            assert is_new

            again, is_new = await repo.create_from_gmail(user_id, message("dup"))
            assert is_new is False
            assert again.id == original.id


class TestIngestRowsAreReadyToScan:
    """
    The scanner reads `email.scan_result` on the row ingest hands it. Left
    unloaded, that read is a lazy load, which raises MissingGreenlet under
    asyncio and failed every Sync Now on the first message it scanned.
    """

    async def test_a_new_row_has_scan_result_loaded(self, session_factory):
        user_id = await make_user(session_factory)
        async with session_factory() as db:
            email, is_new = await EmailRepository(db).create_from_gmail(user_id, message("new"))

            assert is_new
            assert "scan_result" not in inspect(email).unloaded
            assert email.scan_result is None

    async def test_an_existing_row_has_scan_result_loaded(self, session_factory):
        user_id = await make_user(session_factory)
        async with session_factory() as db:
            await EmailRepository(db).create_from_gmail(user_id, message("seen"))
            await db.commit()

        async with session_factory() as db:
            email, is_new = await EmailRepository(db).create_from_gmail(user_id, message("seen"))

            assert not is_new
            assert "scan_result" not in inspect(email).unloaded
