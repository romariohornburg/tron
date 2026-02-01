from uuid import uuid4, UUID
from typing import List
from sqlalchemy.orm import Session

from app.organizations.infra.group_repository import GroupRepository
from app.organizations.infra.group_model import Group as GroupModel
from app.organizations.infra.organization_repository import OrganizationRepository
from app.environments.infra.environment_repository import EnvironmentRepository
from app.applications.infra.application_repository import ApplicationRepository
from app.organizations.api.group_dto import (
    GroupCreate,
    GroupUpdate,
    Group,
)
from app.organizations.core.group_validators import (
    validate_group_create_dto,
    validate_group_update_dto,
    validate_group_exists,
    validate_organization_exists,
    validate_environment_exists,
    validate_application_exists,
    OrganizationNotFoundError,
    EnvironmentNotFoundError,
    ApplicationNotFoundError,
)
from app.organizations.core.enums import ScopeLevel


class GroupService:
    """Business logic for groups. No direct database access."""

    def __init__(
        self,
        repository: GroupRepository,
        organization_repository: OrganizationRepository,
        environment_repository: EnvironmentRepository,
        application_repository: ApplicationRepository,
        database_session: Session,
    ):
        self.repository = repository
        self.organization_repository = organization_repository
        self.environment_repository = environment_repository
        self.application_repository = application_repository
        self.db = database_session

    def create_group(self, dto: GroupCreate) -> Group:
        """Create a new group."""
        validate_group_create_dto(dto)
        validate_organization_exists(self.organization_repository, dto.organization_id)

        # Get organization to get the ID
        organization = self.organization_repository.find_by_uuid(dto.organization_id)
        if not organization:
            raise OrganizationNotFoundError(
                f"Organization with UUID '{dto.organization_id}' not found"
            )

        # Validate scope-specific requirements
        environment_id = None
        application_id = None

        if dto.scope_level == ScopeLevel.ENVIRONMENT:
            if not dto.environment_id:
                raise ValueError("Environment ID is required for environment scope")
            validate_environment_exists(self.environment_repository, dto.environment_id)
            environment = self.environment_repository.find_by_uuid(dto.environment_id)
            if not environment:
                raise EnvironmentNotFoundError(
                    f"Environment with UUID '{dto.environment_id}' not found"
                )
            environment_id = environment.id

        elif dto.scope_level == ScopeLevel.APPLICATION:
            if not dto.application_id:
                raise ValueError("Application ID is required for application scope")
            validate_application_exists(self.application_repository, dto.application_id)
            application = self.application_repository.find_by_uuid(dto.application_id)
            if not application:
                raise ApplicationNotFoundError(
                    f"Application with UUID '{dto.application_id}' not found"
                )
            application_id = application.id

        # Create group
        group = self._build_group_entity(
            dto, organization.id, environment_id, application_id
        )
        group = self.repository.create(group)
        # Ensure organization relationship is loaded for DTO serialization
        if group and group.organization:
            _ = group.organization.uuid
        return group

    def update_group(self, uuid: UUID, dto: GroupUpdate) -> Group:
        """Update an existing group."""
        validate_group_update_dto(dto)
        validate_group_exists(self.repository, uuid)

        group = self.repository.find_by_uuid(uuid)

        if dto.name is not None:
            group.name = dto.name
        if dto.description is not None:
            group.description = dto.description
        if dto.is_default is not None:
            group.is_default = dto.is_default

        # Handle scope_level and role updates
        if dto.scope_level is not None:
            group.scope_level = (
                dto.scope_level.value
                if hasattr(dto.scope_level, "value")
                else dto.scope_level
            )
        if dto.role is not None:
            group.role = dto.role.value if hasattr(dto.role, "value") else dto.role

        # Handle environment_id and application_id updates
        if dto.environment_id is not None:
            if (
                dto.scope_level == ScopeLevel.ENVIRONMENT
                or group.scope_level == ScopeLevel.ENVIRONMENT.value
            ):
                validate_environment_exists(
                    self.environment_repository, dto.environment_id
                )
                environment = self.environment_repository.find_by_uuid(
                    dto.environment_id
                )
                if not environment:
                    raise EnvironmentNotFoundError(
                        f"Environment with UUID '{dto.environment_id}' not found"
                    )
                group.environment_id = environment.id
            else:
                group.environment_id = None
        elif dto.scope_level == ScopeLevel.ORG:
            group.environment_id = None

        if dto.application_id is not None:
            if (
                dto.scope_level == ScopeLevel.APPLICATION
                or group.scope_level == ScopeLevel.APPLICATION.value
            ):
                validate_application_exists(
                    self.application_repository, dto.application_id
                )
                application = self.application_repository.find_by_uuid(
                    dto.application_id
                )
                if not application:
                    raise ApplicationNotFoundError(
                        f"Application with UUID '{dto.application_id}' not found"
                    )
                group.application_id = application.id
            else:
                group.application_id = None
        elif dto.scope_level == ScopeLevel.ORG:
            group.application_id = None

        group = self.repository.update(group)
        # Ensure organization relationship is loaded for DTO serialization
        if group and group.organization:
            _ = group.organization.uuid
        if group and group.environment:
            _ = group.environment.uuid
        if group and group.application:
            _ = group.application.uuid
        return group

    def get_group(self, uuid: UUID) -> Group:
        """Get group by UUID."""
        validate_group_exists(self.repository, uuid)
        group = self.repository.find_by_uuid(uuid)
        # Ensure relationships are loaded for DTO serialization
        if group and group.organization:
            _ = group.organization.uuid
        if group and group.environment:
            _ = group.environment.uuid
        if group and group.application:
            _ = group.application.uuid
        return group

    def get_groups_by_organization(
        self, organization_uuid: UUID, skip: int = 0, limit: int = 100
    ) -> List[Group]:
        """Get all groups for an organization."""
        validate_organization_exists(self.organization_repository, organization_uuid)
        organization = self.organization_repository.find_by_uuid(organization_uuid)
        if not organization:
            raise OrganizationNotFoundError(
                f"Organization with UUID '{organization_uuid}' not found"
            )

        groups = self.repository.find_by_organization_id(
            organization.id, skip=skip, limit=limit
        )
        # Ensure organization relationships are loaded for DTO serialization
        for group in groups:
            if group.organization:
                _ = group.organization.uuid
            if group.environment:
                _ = group.environment.uuid
            if group.application:
                _ = group.application.uuid
        return groups

    def get_groups(self, skip: int = 0, limit: int = 100) -> List[Group]:
        """Get all groups."""
        groups = self.repository.find_all(skip=skip, limit=limit)
        # Ensure organization relationships are loaded for DTO serialization
        for group in groups:
            if group.organization:
                _ = group.organization.uuid
            if group.environment:
                _ = group.environment.uuid
            if group.application:
                _ = group.application.uuid
        return groups

    def delete_group(self, uuid: UUID) -> dict:
        """Delete a group."""
        validate_group_exists(self.repository, uuid)

        group = self.repository.find_by_uuid(uuid)

        try:
            self.repository.delete_by_id(group.id)
            return {"detail": "Group deleted successfully"}
        except Exception as e:
            self.repository.rollback()
            raise Exception(f"Failed to delete group: {str(e)}")

    def _build_group_entity(
        self,
        dto: GroupCreate,
        organization_id: int,
        environment_id: int | None,
        application_id: int | None,
    ) -> GroupModel:
        """Build Group entity from DTO."""
        return GroupModel(
            uuid=uuid4(),
            organization_id=organization_id,
            name=dto.name,
            description=dto.description,
            scope_level=dto.scope_level.value
            if hasattr(dto.scope_level, "value")
            else dto.scope_level,
            role=dto.role.value if hasattr(dto.role, "value") else dto.role,
            environment_id=environment_id,
            application_id=application_id,
            is_default=dto.is_default,
        )
