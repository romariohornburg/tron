from uuid import UUID
from typing import Optional, List

from app.auth.infra.identity_provider_model import IdentityProvider
from app.auth.infra.identity_provider_repository import IdentityProviderRepository
from app.auth.api.identity_provider_dto import (
    IdentityProviderCreate,
    IdentityProviderUpdate,
    IdentityProviderResponse,
    IdentityProviderPublic,
)
from app.shared.crypto.secrets_crypto import (
    encrypt_secret,
    decrypt_secret,
    mask_secret_value,
)


class IdentityProviderSlugAlreadyExistsError(Exception):
    def __init__(self, slug: str):
        self.slug = slug
        super().__init__(f"Identity provider with slug '{slug}' already exists.")


class IdentityProviderNotFoundError(Exception):
    pass


class IdentityProviderService:
    def __init__(self, repository: IdentityProviderRepository):
        self.repository = repository

    def _model_to_response(self, model: IdentityProvider) -> IdentityProviderResponse:
        client_secret_masked = None
        if model.client_secret_encrypted:
            try:
                plain = decrypt_secret(model.client_secret_encrypted)
                client_secret_masked = mask_secret_value(plain)
            except Exception:
                client_secret_masked = "********"
        return IdentityProviderResponse(
            id=model.id,
            uuid=str(model.uuid),
            slug=model.slug,
            display_name=model.display_name,
            client_id=model.client_id,
            client_secret_masked=client_secret_masked,
            authorization_url=model.authorization_url,
            token_url=model.token_url,
            userinfo_url=model.userinfo_url,
            scopes=model.scopes,
            is_enabled=model.is_enabled,
            organization_id=model.organization_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def list(
        self,
        skip: int = 0,
        limit: int = 100,
        enabled_only: bool = False,
        organization_id: Optional[int] = None,
    ) -> List[IdentityProviderResponse]:
        items = self.repository.find_all(
            skip=skip,
            limit=limit,
            enabled_only=enabled_only,
            organization_id=organization_id,
        )
        return [self._model_to_response(m) for m in items]

    def list_public_enabled(self) -> List[IdentityProviderPublic]:
        """For login page: only enabled providers, slug + display_name."""
        items = self.repository.find_all(skip=0, limit=50, enabled_only=True)
        return [
            IdentityProviderPublic(slug=m.slug, display_name=m.display_name)
            for m in items
        ]

    def get_by_id(self, id: int) -> IdentityProviderResponse:
        model = self.repository.find_by_id(id)
        if not model:
            raise IdentityProviderNotFoundError()
        return self._model_to_response(model)

    def get_by_uuid(self, uuid: UUID) -> IdentityProviderResponse:
        model = self.repository.find_by_uuid(uuid)
        if not model:
            raise IdentityProviderNotFoundError()
        return self._model_to_response(model)

    def get_by_slug(self, slug: str) -> Optional[IdentityProvider]:
        """Returns raw model for OAuth flow (needs decrypted secret)."""
        return self.repository.find_by_slug(slug)

    def get_client_secret_plain(self, provider: IdentityProvider) -> Optional[str]:
        if not provider.client_secret_encrypted:
            return None
        return decrypt_secret(provider.client_secret_encrypted)

    def create(self, data: IdentityProviderCreate) -> IdentityProviderResponse:
        if self.repository.find_by_slug(data.slug):
            raise IdentityProviderSlugAlreadyExistsError(data.slug)
        encrypted = encrypt_secret(data.client_secret) if data.client_secret else None
        model = IdentityProvider(
            slug=data.slug,
            display_name=data.display_name,
            client_id=data.client_id,
            client_secret_encrypted=encrypted,
            authorization_url=data.authorization_url,
            token_url=data.token_url,
            userinfo_url=data.userinfo_url,
            scopes=data.scopes,
            is_enabled=data.is_enabled,
            organization_id=data.organization_id,
        )
        model = self.repository.create(model)
        return self._model_to_response(model)

    def update(
        self, uuid: UUID, data: IdentityProviderUpdate
    ) -> IdentityProviderResponse:
        model = self.repository.find_by_uuid(uuid)
        if not model:
            raise IdentityProviderNotFoundError()
        if data.display_name is not None:
            model.display_name = data.display_name
        if data.client_id is not None:
            model.client_id = data.client_id
        if data.client_secret is not None:
            model.client_secret_encrypted = encrypt_secret(data.client_secret)
        if data.authorization_url is not None:
            model.authorization_url = data.authorization_url
        if data.token_url is not None:
            model.token_url = data.token_url
        if data.userinfo_url is not None:
            model.userinfo_url = data.userinfo_url
        if data.scopes is not None:
            model.scopes = data.scopes
        if data.is_enabled is not None:
            model.is_enabled = data.is_enabled
        if data.organization_id is not None:
            model.organization_id = data.organization_id
        model = self.repository.update(model)
        return self._model_to_response(model)

    def delete(self, uuid: UUID) -> None:
        model = self.repository.find_by_uuid(uuid)
        if not model:
            raise IdentityProviderNotFoundError()
        self.repository.delete(model)
