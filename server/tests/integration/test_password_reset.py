import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.deps import get_db as deps_get_db
from app.core.security import UserRole, hash_password, verify_password
from app.database.database import get_db
from app.database.models import Base, User
from app.main import app
from app.services.mail_service import MailService

PASSWORD = "original-password"


class CapturingMail(MailService):
    """Stands in for the transport and keeps what it was handed."""

    sent: list[tuple[str, str]] = []

    async def send_password_reset(self, to_email: str, reset_url: str) -> bool:
        CapturingMail.sent.append((to_email, reset_url))
        return True


@pytest.fixture
async def client(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path}/reset.sqlite3")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_db():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    CapturingMail.sent = []
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[deps_get_db] = override_db
    app.dependency_overrides[MailService] = CapturingMail

    async with factory() as session:
        session.add(
            User(
                id=uuid.uuid4(),
                name="Reset User",
                email="reset@example.com",
                hashed_password=hash_password(PASSWORD),
                role=UserRole.USER,
            )
        )
        await session.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as http:
        yield http, factory

    app.dependency_overrides.clear()
    await engine.dispose()


def token_from_last_link() -> str:
    _, url = CapturingMail.sent[-1]
    return url.split("token=", 1)[1]


async def stored_hash(factory, email: str = "reset@example.com") -> str:
    async with factory() as session:
        result = await session.execute(select(User).where(User.email == email))
        return result.scalar_one().hashed_password


@pytest.mark.asyncio
async def test_request_sends_a_link_to_a_known_address(client):
    http, _ = client
    response = await http.post(
        "/api/v1/auth/forgot-password", json={"email": "reset@example.com"}
    )

    assert response.status_code == 200
    assert len(CapturingMail.sent) == 1
    to_email, url = CapturingMail.sent[0]
    assert to_email == "reset@example.com"
    assert "/reset-password?token=" in url


@pytest.mark.asyncio
async def test_unknown_address_is_answered_the_same_way(client):
    """The response must not distinguish a registered address from a stranger."""
    http, _ = client
    known = await http.post(
        "/api/v1/auth/forgot-password", json={"email": "reset@example.com"}
    )
    unknown = await http.post(
        "/api/v1/auth/forgot-password", json={"email": "nobody@example.com"}
    )

    assert unknown.status_code == known.status_code
    assert unknown.json() == known.json()
    assert [to for to, _ in CapturingMail.sent] == ["reset@example.com"]


@pytest.mark.asyncio
async def test_the_link_resets_the_password(client):
    http, factory = client
    await http.post(
        "/api/v1/auth/forgot-password", json={"email": "reset@example.com"}
    )

    response = await http.post(
        "/api/v1/auth/reset-password",
        json={"token": token_from_last_link(), "password": "a-new-password"},
    )
    assert response.status_code == 200

    assert verify_password("a-new-password", await stored_hash(factory))

    login = await http.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "a-new-password"},
    )
    assert login.status_code == 200


@pytest.mark.asyncio
async def test_a_spent_token_cannot_be_used_twice(client):
    http, factory = client
    await http.post(
        "/api/v1/auth/forgot-password", json={"email": "reset@example.com"}
    )
    token = token_from_last_link()

    first = await http.post(
        "/api/v1/auth/reset-password", json={"token": token, "password": "first-one"}
    )
    second = await http.post(
        "/api/v1/auth/reset-password", json={"token": token, "password": "second-one"}
    )

    assert first.status_code == 200
    assert second.status_code == 400
    assert verify_password("first-one", await stored_hash(factory))


@pytest.mark.asyncio
async def test_an_earlier_token_dies_when_a_later_one_is_used(client):
    """Two requests in flight: spending either must retire the other."""
    http, factory = client
    await http.post(
        "/api/v1/auth/forgot-password", json={"email": "reset@example.com"}
    )
    first_token = token_from_last_link()
    await http.post(
        "/api/v1/auth/forgot-password", json={"email": "reset@example.com"}
    )
    second_token = token_from_last_link()

    assert (
        await http.post(
            "/api/v1/auth/reset-password",
            json={"token": second_token, "password": "chosen-password"},
        )
    ).status_code == 200

    stale = await http.post(
        "/api/v1/auth/reset-password",
        json={"token": first_token, "password": "hijacked-password"},
    )
    assert stale.status_code == 400
    assert verify_password("chosen-password", await stored_hash(factory))


@pytest.mark.asyncio
async def test_an_access_token_is_not_a_reset_token(client):
    """A stolen access token must not be spendable as a password change."""
    http, factory = client
    login = await http.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": PASSWORD},
    )
    access_token = login.json()["access_token"]

    response = await http.post(
        "/api/v1/auth/reset-password",
        json={"token": access_token, "password": "not-this-way"},
    )

    assert response.status_code == 400
    assert verify_password(PASSWORD, await stored_hash(factory))


@pytest.mark.asyncio
async def test_a_reset_token_is_not_an_access_token(client):
    """And the reverse: the reset link must not authenticate a session."""
    http, _ = client
    await http.post(
        "/api/v1/auth/forgot-password", json={"email": "reset@example.com"}
    )

    response = await http.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token_from_last_link()}"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_garbage_and_short_passwords_are_refused(client):
    http, factory = client
    await http.post(
        "/api/v1/auth/forgot-password", json={"email": "reset@example.com"}
    )
    token = token_from_last_link()

    assert (
        await http.post(
            "/api/v1/auth/reset-password",
            json={"token": "not-a-token", "password": "long-enough-password"},
        )
    ).status_code == 400
    assert (
        await http.post(
            "/api/v1/auth/reset-password", json={"token": token, "password": "short"}
        )
    ).status_code == 422
    assert verify_password(PASSWORD, await stored_hash(factory))
