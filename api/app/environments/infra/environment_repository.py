from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List
from app.environments.infra.environment_model import Environment as EnvironmentModel
from app.webapps.infra.application_component_model import (
    ApplicationComponent as ApplicationComponentModel,
)
from app.instances.infra.instance_model import Instance as InstanceModel


class EnvironmentRepository:
    """Repository for Environment database operations. No business logic here."""

    def __init__(self, database_session: Session):
        self.db = database_session

    def find_by_uuid(self, uuid: UUID) -> Optional[EnvironmentModel]:
        """Find environment by UUID."""
        return (
            self.db.query(EnvironmentModel)
            .filter(EnvironmentModel.uuid == uuid)
            .first()
        )

    def find_by_name(self, name: str, organization_id: int) -> Optional[EnvironmentModel]:
        """Find environment by name within an organization."""
        return (
            self.db.query(EnvironmentModel)
            .filter(
                EnvironmentModel.name == name,
                EnvironmentModel.organization_id == organization_id
            )
            .first()
        )

    def find_by_name_excluding_uuid(
        self, name: str, organization_id: int, exclude_uuid: UUID
    ) -> Optional[EnvironmentModel]:
        """Find environment by name within an organization excluding a specific UUID."""
        return (
            self.db.query(EnvironmentModel)
            .filter(
                EnvironmentModel.name == name,
                EnvironmentModel.organization_id == organization_id,
                EnvironmentModel.uuid != exclude_uuid
            )
            .first()
        )

    def find_all(
        self, organization_id: int, skip: int = 0, limit: int = 100
    ) -> List[EnvironmentModel]:
        """Find all environments within an organization."""
        return (
            self.db.query(EnvironmentModel)
            .filter(EnvironmentModel.organization_id == organization_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def find_by_uuid_and_organization(
        self, uuid: UUID, organization_id: int
    ) -> Optional[EnvironmentModel]:
        """Find environment by UUID within an organization."""
        return (
            self.db.query(EnvironmentModel)
            .filter(
                EnvironmentModel.uuid == uuid,
                EnvironmentModel.organization_id == organization_id
            )
            .first()
        )

    def find_components_by_environment_id(
        self, environment_id: int
    ) -> List[ApplicationComponentModel]:
        """Find all components associated with an environment."""
        return (
            self.db.query(ApplicationComponentModel)
            .join(InstanceModel)
            .filter(InstanceModel.environment_id == environment_id)
            .all()
        )

    def create(self, environment: EnvironmentModel) -> EnvironmentModel:
        """Create a new environment."""
        self.db.add(environment)
        self.db.commit()
        self.db.refresh(environment)
        return environment

    def update(self, environment: EnvironmentModel) -> EnvironmentModel:
        """Update an existing environment."""
        self.db.commit()
        self.db.refresh(environment)
        return environment

    def delete(self, environment: EnvironmentModel) -> None:
        """Delete an environment."""
        self.db.delete(environment)
        self.db.commit()

    def rollback(self) -> None:
        """Rollback current transaction."""
        self.db.rollback()
