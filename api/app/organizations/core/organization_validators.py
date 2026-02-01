from uuid import UUID
from app.organizations.infra.organization_repository import OrganizationRepository
from app.users.infra.user_repository import UserRepository


class OrganizationNotFoundError(Exception):
    """Raised when organization is not found."""

    pass


class OrganizationNameAlreadyExistsError(Exception):
    """Raised when organization name already exists."""

    pass


class UserNotFoundError(Exception):
    """Raised when user is not found."""

    pass


def validate_organization_exists(
    repository: OrganizationRepository, uuid: UUID
) -> None:
    """Validate that organization exists. Raises OrganizationNotFoundError if not found."""
    organization = repository.find_by_uuid(uuid)
    if not organization:
        raise OrganizationNotFoundError(f"Organization with UUID '{uuid}' not found")


def validate_organization_name_uniqueness(
    repository: OrganizationRepository, name: str, exclude_uuid: UUID = None
) -> None:
    """Validate that organization name is unique. Raises OrganizationNameAlreadyExistsError if not unique."""
    existing = None
    if exclude_uuid:
        existing = repository.find_by_name_excluding_uuid(name, exclude_uuid)
    else:
        existing = repository.find_by_name(name)

    if existing:
        raise OrganizationNameAlreadyExistsError(
            f"Organization with name '{name}' already exists"
        )


def validate_user_exists(repository: UserRepository, user_uuid: UUID) -> None:
    """Validate that user exists. Raises UserNotFoundError if not found."""
    user = repository.find_by_uuid(user_uuid)
    if not user:
        raise UserNotFoundError(f"User with UUID '{user_uuid}' not found")


def validate_organization_create_dto(dto) -> None:
    """Validate organization create DTO."""
    if not dto.name or not dto.name.strip():
        raise ValueError("Organization name is required")


def validate_organization_update_dto(dto) -> None:
    """Validate organization update DTO."""
    if dto.name is not None and not dto.name.strip():
        raise ValueError("Organization name cannot be empty")
