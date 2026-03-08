import hmac
import hashlib
import base64
import time
from urllib.parse import urlencode
from typing import Optional

import httpx
from fastapi import HTTPException, status

from app.auth.infra.identity_provider_model import IdentityProvider
from app.auth.core.identity_provider_service import IdentityProviderService
from app.auth.infra.user_social_account_model import UserSocialAccount
from app.auth.infra.user_social_account_repository import UserSocialAccountRepository
from app.users.infra.user_model import User
from app.users.infra.user_repository import UserRepository


def _make_state(slug: str, secret_key: str) -> str:
    """Create signed state parameter for CSRF protection (valid ~10 min)."""
    raw = f"{slug}|{int(time.time())}"
    sig = hmac.new(
        secret_key.encode() if isinstance(secret_key, str) else secret_key,
        raw.encode(),
        hashlib.sha256,
    ).hexdigest()
    payload = f"{raw}|{sig}"
    return base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")


def _verify_state(
    state: str, slug: str, secret_key: str, max_age_seconds: int = 600
) -> bool:
    try:
        padding = 4 - len(state) % 4
        if padding != 4:
            state += "=" * padding
        payload = base64.urlsafe_b64decode(state.encode()).decode()
        parts = payload.rsplit("|", 1)
        if len(parts) != 2:
            return False
        raw, sig = parts
        expected_sig = hmac.new(
            secret_key.encode() if isinstance(secret_key, str) else secret_key,
            raw.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return False
        slug_part, ts_part = raw.split("|")
        if slug_part != slug:
            return False
        ts = int(ts_part)
        return time.time() - ts <= max_age_seconds
    except Exception:
        return False


class OAuthService:
    def __init__(
        self,
        identity_provider_service: IdentityProviderService,
        user_repository: UserRepository,
        user_social_account_repository: UserSocialAccountRepository,
        secret_key: str,
    ):
        self.idp_service = identity_provider_service
        self.user_repository = user_repository
        self.social_repository = user_social_account_repository
        self.secret_key = secret_key

    def build_authorization_url(
        self,
        slug: str,
        redirect_uri: str,
    ) -> str:
        provider = self.idp_service.get_by_slug(slug)
        if not provider or not provider.is_enabled:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Identity provider not found or disabled",
            )
        state = _make_state(slug, self.secret_key)
        params = {
            "response_type": "code",
            "client_id": provider.client_id,
            "redirect_uri": redirect_uri,
            "scope": provider.scopes,
            "state": state,
        }
        return (
            provider.authorization_url
            + ("&" if "?" in provider.authorization_url else "?")
            + urlencode(params)
        )

    def exchange_code_and_get_user(
        self,
        slug: str,
        code: str,
        state: str,
        redirect_uri: str,
    ) -> User:
        if not _verify_state(state, slug, self.secret_key):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired state. Please try signing in again.",
            )
        provider = self.idp_service.get_by_slug(slug)
        if not provider or not provider.is_enabled:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Identity provider not found or disabled",
            )
        client_secret = self.idp_service.get_client_secret_plain(provider)
        if not client_secret:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Identity provider is not configured correctly",
            )
        # Exchange code for tokens
        token_data = self._exchange_code(provider, code, redirect_uri, client_secret)
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provider response missing access_token",
            )
        # Get user info
        userinfo = self._get_userinfo(provider, access_token)
        provider_user_id = userinfo.get("sub") or userinfo.get("id")
        if not provider_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provider did not return user identifier",
            )
        email = (userinfo.get("email") or "").strip() or None
        name = (userinfo.get("name") or userinfo.get("full_name") or "").strip() or None
        picture = (
            userinfo.get("picture") or userinfo.get("avatar_url") or ""
        ).strip() or None
        return self._find_or_create_user_and_link(
            provider=provider,
            provider_user_id=str(provider_user_id),
            email=email,
            full_name=name,
            avatar_url=picture,
        )

    def _exchange_code(
        self,
        provider: IdentityProvider,
        code: str,
        redirect_uri: str,
        client_secret: str,
    ) -> dict:
        body = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": provider.client_id,
            "client_secret": client_secret,
        }
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        with httpx.Client() as client:
            resp = client.post(
                provider.token_url,
                data=body,
                headers=headers,
                timeout=15.0,
            )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error exchanging code for token: {resp.text[:200]}",
            )
        return resp.json()

    def _get_userinfo(self, provider: IdentityProvider, access_token: str) -> dict:
        if not provider.userinfo_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Identity provider has no userinfo_url configured",
            )
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }
        with httpx.Client() as client:
            resp = client.get(
                provider.userinfo_url,
                headers=headers,
                timeout=10.0,
            )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error fetching user data from provider",
            )
        return resp.json()

    def _find_or_create_user_and_link(
        self,
        provider: IdentityProvider,
        provider_user_id: str,
        email: Optional[str],
        full_name: Optional[str],
        avatar_url: Optional[str],
    ) -> User:
        social = self.social_repository.find_by_provider_and_provider_user_id(
            provider.id, provider_user_id
        )
        if social:
            user = social.user
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is inactive",
                )
            return user
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provider did not return email. Email is required to link the account.",
            )
        existing = self.user_repository.find_by_email(email)
        if existing:
            user = existing
        else:
            user = User(
                email=email,
                hashed_password=None,
                full_name=full_name or email.split("@")[0],
                is_active=True,
                role="user",
                avatar_url=avatar_url,
            )
            user = self.user_repository.create(user)
        link = UserSocialAccount(
            user_id=user.id,
            identity_provider_id=provider.id,
            provider_user_id=provider_user_id,
            provider_email=email,
        )
        self.social_repository.create(link)
        return user
