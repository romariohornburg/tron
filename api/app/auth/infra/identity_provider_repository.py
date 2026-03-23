from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List

from app.auth.infra.identity_provider_model import IdentityProvider


class IdentityProviderRepository:
    def __init__(self, database_session: Session):
        self.db = database_session

    def find_by_id(self, id: int) -> Optional[IdentityProvider]:
        return self.db.query(IdentityProvider).filter(IdentityProvider.id == id).first()

    def find_by_uuid(self, uuid: UUID) -> Optional[IdentityProvider]:
        return (
            self.db.query(IdentityProvider)
            .filter(IdentityProvider.uuid == uuid)
            .first()
        )

    def find_by_slug(self, slug: str) -> Optional[IdentityProvider]:
        return (
            self.db.query(IdentityProvider)
            .filter(IdentityProvider.slug == slug)
            .first()
        )

    def find_all(
        self,
        skip: int = 0,
        limit: int = 100,
        enabled_only: bool = False,
        organization_id: Optional[int] = None,
    ) -> List[IdentityProvider]:
        query = self.db.query(IdentityProvider)
        if enabled_only:
            query = query.filter(IdentityProvider.is_enabled.is_(True))
        if organization_id is not None:
            query = query.filter(IdentityProvider.organization_id == organization_id)
        return (
            query.order_by(IdentityProvider.display_name)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, provider: IdentityProvider) -> IdentityProvider:
        self.db.add(provider)
        self.db.commit()
        self.db.refresh(provider)
        return provider

    def update(self, provider: IdentityProvider) -> IdentityProvider:
        self.db.commit()
        self.db.refresh(provider)
        return provider

    def delete(self, provider: IdentityProvider) -> None:
        self.db.delete(provider)
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()
