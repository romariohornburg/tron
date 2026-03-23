"""Repository for EnvironmentSettings (table settings). One row per environment."""

from sqlalchemy.orm import Session
from typing import Optional

from app.environments.infra.environment_settings_model import (
    EnvironmentSettings as EnvironmentSettingsModel,
)


class EnvironmentSettingsRepository:
    """Repository for environment settings. No business logic."""

    def __init__(self, database_session: Session):
        self.db = database_session

    def find_by_environment_id(
        self, environment_id: int
    ) -> Optional[EnvironmentSettingsModel]:
        """Find the single settings row for an environment."""
        return (
            self.db.query(EnvironmentSettingsModel)
            .filter(EnvironmentSettingsModel.environment_id == environment_id)
            .first()
        )

    def find_by_environment_id_and_organization(
        self, environment_id: int, organization_id: int
    ) -> Optional[EnvironmentSettingsModel]:
        """Find settings by environment ID scoped to organization."""
        return (
            self.db.query(EnvironmentSettingsModel)
            .filter(
                EnvironmentSettingsModel.environment_id == environment_id,
                EnvironmentSettingsModel.organization_id == organization_id,
            )
            .first()
        )

    def create(self, row: EnvironmentSettingsModel) -> EnvironmentSettingsModel:
        """Create a new environment settings row."""
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def update(self, row: EnvironmentSettingsModel) -> EnvironmentSettingsModel:
        """Update existing environment settings."""
        self.db.commit()
        self.db.refresh(row)
        return row
