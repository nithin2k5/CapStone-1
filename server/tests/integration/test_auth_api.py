import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_register_and_login():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        register_resp = await client.post(
            "/api/v1/auth/register",
            json={
                "name": "Test User",
                "email": "testuser@example.com",
                "password": "testpass123",
            },
        )
        assert register_resp.status_code in (201, 409)

        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "testpass123"},
        )
        assert login_resp.status_code == 200
        data = login_resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
