from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List
from app.settings.infra.settings_model import Settings as SettingsModel
from app.environments.infra.environment_model import Environment as EnvironmentModel


class SettingsRepository:
    """Repository for Settings database operations. No business logic here."""

    def __init__(self, database_session: Session):
        self.db = database_session

    def find_by_uuid(self, uuid: UUID, organization_id: int | None = None) -> Optional[SettingsModel]:
        """Find settings by UUID, optionally filtered by organization_id."""
        query = self.db.query(SettingsModel).filter(SettingsModel.uuid == uuid)
        if organization_id is not None:
            query = query.filter(SettingsModel.organization_id == organization_id)
        return query.first()

    def find_by_key_and_environment_id(
        self, key: str, environment_id: int, organization_id: int | None = None
    ) -> Optional[SettingsModel]:
        """Find settings by key and environment ID, optionally filtered by organization_id."""
        query = (
            self.db.query(SettingsModel)
            .filter(
                SettingsModel.key == key, SettingsModel.environment_id == environment_id
            )
        )
        if organization_id is not None:
            query = query.filter(SettingsModel.organization_id == organization_id)
        return query.first()

    def find_all(
        self, skip: int = 0, limit: int = 100, organization_id: int | None = None
    ) -> List[SettingsModel]:
        """Find all settings, optionally filtered by organization_id."""
        query = self.db.query(SettingsModel)
        if organization_id is not None:
            query = query.filter(SettingsModel.organization_id == organization_id)
        return query.offset(skip).limit(limit).all()
    
    def find_by_organization_id(
        self, organization_id: int, skip: int = 0, limit: int = 100
    ) -> List[SettingsModel]:
        """Find settings by organization_id."""
        return self.find_all(skip=skip, limit=limit, organization_id=organization_id)

    def find_environment_by_uuid(self, uuid: UUID) -> Optional[EnvironmentModel]:
        """Find environment by UUID."""
        return (
            self.db.query(EnvironmentModel)
            .filter(EnvironmentModel.uuid == uuid)
            .first()
        )

    def create(self, settings: SettingsModel) -> SettingsModel:
        """Create a new settings."""
        self.db.add(settings)
        try:
            self.db.commit()
            self.db.refresh(settings)
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to create settings: {str(e)}")
        return settings

    def update(self, settings: SettingsModel) -> SettingsModel:
        """Update an existing settings."""
        try:
            self.db.commit()
            self.db.refresh(settings)
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to update settings: {str(e)}")
        return settings

    def delete(self, settings: SettingsModel) -> None:
        """Delete a settings."""
        self.db.delete(settings)
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to delete settings: {str(e)}")

    def rollback(self) -> None:
        """Rollback current transaction."""
        self.db.rollback()
