import json
from typing import Any
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("microsoft")

class MicrosoftService:
    """
    Microsoft OAuth integration service.
    Exchanges OAuth2 codes for access/refresh tokens and fetches user profile.
    """

    SCOPES = [
        "openid",
        "email",
        "profile",
        "User.Read",
    ]

    def __init__(self) -> None:
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return bool(
            self.settings.microsoft_client_id
            and self.settings.microsoft_client_secret
        )

    def get_oauth_url(self, state: str = "default_state") -> str:
        """Generate Microsoft OAuth authorization URL."""
        base = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
        params = (
            f"client_id={self.settings.microsoft_client_id}"
            f"&redirect_uri={self.settings.microsoft_redirect_uri}"
            f"&response_type=code"
            f"&scope={'%20'.join(self.SCOPES)}"
            f"&prompt=select_account"
            f"&state={state}"
        )
        return f"{base}?{params}"

    async def exchange_code(
        self, code: str, redirect_uri: str | None = None
    ) -> dict[str, Any]:
        """Exchange authorization code for tokens via Microsoft's token endpoint."""
        if not self.is_configured():
            logger.warning("Microsoft OAuth not configured, returning mock tokens")
            return {
                "access_token": "mock_microsoft_access_token",
                "refresh_token": "mock_microsoft_refresh_token",
                "expires_in": 3600,
            }

        url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
        data = {
            "client_id": self.settings.microsoft_client_id,
            "client_secret": self.settings.microsoft_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri or self.settings.microsoft_redirect_uri,
        }
        
        async with httpx.AsyncClient() as client:
            res = await client.post(url, data=data)
            if res.status_code != 200:
                logger.error(
                    "Failed to exchange Microsoft OAuth code: %s - %s",
                    res.status_code,
                    res.text,
                )
                return {"error": res.text}
            return res.json()

    async def get_user_info(self, access_token: str) -> dict[str, Any]:
        """Fetch user profile from Microsoft Graph API."""
        if access_token == "mock_microsoft_access_token":
            return {"email": "mock.microsoft@user.com", "name": "Mock Microsoft User"}

        url = "https://graph.microsoft.com/v1.0/me"
        async with httpx.AsyncClient() as client:
            res = await client.get(
                url, headers={"Authorization": f"Bearer {access_token}"}
            )
            if res.status_code != 200:
                logger.error(
                    "Failed to get Microsoft userinfo: %s - %s",
                    res.status_code,
                    res.text,
                )
                return {}
            
            data = res.json()
            return {
                "email": data.get("mail") or data.get("userPrincipalName"),
                "name": data.get("displayName", "Microsoft User")
            }
