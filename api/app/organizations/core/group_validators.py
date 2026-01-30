from uuid import UUID
from app.organizations.infra.group_repository import GroupRepository
from app.organizations.infra.organization_repository import OrganizationRepository
from app.environments.infra.environment_repository import EnvironmentRepository
from app.applications.infra.application_repository import ApplicationRepository


class GroupNotFoundError(Exception):
    """Raised when group is not found."""
    pass


class GroupNameAlreadyExistsError(Exception):
    """Raised when group name already exists within an organization."""
    pass


class OrganizationNotFoundError(Exception):
    """Raised when organization is not found."""
    pass


class EnvironmentNotFoundError(Exception):
    """Raised when environment is not found."""
    pass


class ApplicationNotFoundError(Exception):
    """Raised when application is not found."""
    pass


def validate_group_exists(repository: GroupRepository, uuid: UUID) -> None:
    """Validate that group exists. Raises GroupNotFoundError if not found."""
    group = repository.find_by_uuid(uuid)
    if not group:
        raise GroupNotFoundError(f"Group with UUID '{uuid}' not found")


def validate_organization_exists(repository: OrganizationRepository, organization_uuid: UUID) -> None:
    """Validate that organization exists. Raises OrganizationNotFoundError if not found."""
    organization = repository.find_by_uuid(organization_uuid)
    if not organization:
        raise OrganizationNotFoundError(f"Organization with UUID '{organization_uuid}' not found")


def validate_environment_exists(repository: EnvironmentRepository, environment_uuid: UUID) -> None:
    """Validate that environment exists. Raises EnvironmentNotFoundError if not found."""
    environment = repository.find_by_uuid(environment_uuid)
    if not environment:
        raise EnvironmentNotFoundError(f"Environment with UUID '{environment_uuid}' not found")


def validate_application_exists(repository: ApplicationRepository, application_uuid: UUID) -> None:
    """Validate that application exists. Raises ApplicationNotFoundError if not found."""
    application = repository.find_by_uuid(application_uuid)
    if not application:
        raise ApplicationNotFoundError(f"Application with UUID '{application_uuid}' not found")


def validate_group_create_dto(dto) -> None:
    """Validate group create DTO."""
    if not dto.name or not dto.name.strip():
        raise ValueError("Group name is required")
    if not dto.organization_id:
        raise ValueError("Organization ID is required")
    if not dto.scope_level:
        raise ValueError("Scope level is required")
    if not dto.role:
        raise ValueError("Role is required")


def validate_group_update_dto(dto) -> None:
    """Validate group update DTO."""
    if dto.name is not None and not dto.name.strip():
        raise ValueError("Group name cannot be empty")
