from uuid import uuid4, UUID
from typing import List
from app.environments.infra.environment_repository import EnvironmentRepository
from app.environments.infra.environment_model import Environment as EnvironmentModel
from app.environments.api.environment_dto import (
    EnvironmentCreate,
    Environment,
    EnvironmentWithClusters,
)
from app.environments.core.environment_validators import (
    validate_environment_create_dto,
    validate_environment_can_be_deleted,
)


class EnvironmentService:
    """Business logic for environments. No direct database access."""

    def __init__(self, repository: EnvironmentRepository):
        self.repository = repository

    def create_environment(
        self, dto: EnvironmentCreate, organization_id: int
    ) -> Environment:
        """Create a new environment within an organization."""
        validate_environment_create_dto(dto)

        environment = self._build_environment_entity(dto, organization_id)
        return self.repository.create(environment)

    def update_environment(
        self, uuid: UUID, dto: EnvironmentCreate, organization_id: int
    ) -> Environment:
        """Update an existing environment within an organization."""
        validate_environment_create_dto(dto)

        environment = self.repository.find_by_uuid_and_organization(
            uuid, organization_id
        )
        if not environment:
            raise ValueError(f"Environment with UUID {uuid} not found in organization")

        environment.name = dto.name

        return self.repository.update(environment)

    def get_environment_id_for_organization(
        self, organization_id: int, environment_uuid: UUID
    ) -> int:
        """Resolve environment UUID to ID. Validates that environment belongs to organization.
        Raises ValueError if not found or does not belong to organization.
        Use this when you need environment_id (e.g. for authorization) from (org_id, env_uuid).
        """
        environment = self.repository.find_by_uuid_and_organization(
            environment_uuid, organization_id
        )
        if not environment:
            raise ValueError(
                f"Environment with UUID {environment_uuid} not found in organization"
            )
        return environment.id

    def get_environment(
        self, uuid: UUID, organization_id: int
    ) -> EnvironmentWithClusters:
        """Get environment by UUID with clusters and settings within an organization."""
        environment = self.repository.find_by_uuid_and_organization(
            uuid, organization_id
        )
        if not environment:
            raise ValueError(f"Environment with UUID {uuid} not found in organization")

        return self._serialize_environment_with_clusters(environment)

    def get_environments(
        self, organization_id: int, skip: int = 0, limit: int = 100
    ) -> List[EnvironmentWithClusters]:
        """Get all environments with clusters and settings within an organization."""
        environments = self.repository.find_all(
            organization_id=organization_id, skip=skip, limit=limit
        )
        return [self._serialize_environment_with_clusters(env) for env in environments]

    def delete_environment(self, uuid: UUID, organization_id: int) -> dict:
        """Delete an environment within an organization."""
        environment = self.repository.find_by_uuid_and_organization(
            uuid, organization_id
        )
        if not environment:
            raise ValueError(f"Environment with UUID {uuid} not found in organization")

        validate_environment_can_be_deleted(self.repository, uuid)

        self.repository.delete(environment)

        return {"detail": "Environment deleted successfully"}

    def _build_environment_entity(
        self, dto: EnvironmentCreate, organization_id: int
    ) -> EnvironmentModel:
        """Build Environment entity from DTO."""
        return EnvironmentModel(
            uuid=uuid4(),
            name=dto.name,
            organization_id=organization_id,
        )

    def _serialize_environment_with_clusters(
        self, environment: EnvironmentModel
    ) -> EnvironmentWithClusters:
        """Serialize environment with clusters and settings."""
        return EnvironmentWithClusters(
            uuid=environment.uuid,
            name=environment.name,
            clusters=[cluster.name for cluster in environment.clusters],
            settings=[
                {
                    "key": setting.key,
                    "value": setting.value,
                    "description": setting.description,
                }
                for setting in environment.settings
            ],
            created_at=environment.created_at.isoformat(),
            updated_at=environment.updated_at.isoformat(),
        )
