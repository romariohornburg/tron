from uuid import UUID
from typing import List
from app.users.infra.user_repository import UserRepository
from app.users.api.user_dto import UserCreate, UserUpdate


class UserNotFoundError(Exception):
    """Raised when user is not found."""

    pass


class UserEmailAlreadyExistsError(Exception):
    """Raised when user email already exists."""

    pass


class CannotDeleteSelfError(Exception):
    """Raised when trying to delete own user."""

    pass


class UserIsOrganizationOwnerError(Exception):
    """Raised when trying to delete a user who is owner of one or more organizations."""

    def __init__(self, organization_names: List[str]):
        self.organization_names = organization_names
        names = ", ".join(organization_names)
        super().__init__(
            f"User is owner of organization(s): {names}. "
            "Transfer ownership to another user before deleting."
        )


def validate_user_create_dto(dto: UserCreate) -> None:
    """Validate user create DTO. Raises ValueError if validation fails."""
    if not dto.email or not dto.email.strip():
        raise ValueError("User email is required and cannot be empty")

    if not dto.password or len(dto.password) < 6:
        raise ValueError("Password must be at least 6 characters long")


def validate_user_update_dto(dto: UserUpdate) -> None:
    """Validate user update DTO. Raises ValueError if validation fails."""
    if dto.email is not None and not dto.email.strip():
        raise ValueError("User email cannot be empty")

    if dto.password is not None and len(dto.password) < 6:
        raise ValueError("Password must be at least 6 characters long")


def validate_user_exists(repository: UserRepository, uuid: UUID) -> None:
    """Validate that user exists. Raises UserNotFoundError if not found."""
    user = repository.find_by_uuid(uuid)
    if not user:
        raise UserNotFoundError(f"User with UUID '{uuid}' not found")


def validate_user_email_uniqueness(
    repository: UserRepository, email: str, exclude_uuid: UUID = None
) -> None:
    """Validate that user email is unique."""
    existing_user = repository.find_by_email(email)
    if existing_user:
        if exclude_uuid and existing_user.uuid == exclude_uuid:
            return  # Same user, OK
        raise UserEmailAlreadyExistsError(f"User with email '{email}' already exists")


def validate_can_delete_user(
    repository: UserRepository, user_uuid: UUID, current_user_uuid: UUID
) -> None:
    """Validate that user can be deleted (not self)."""
    if user_uuid == current_user_uuid:
        raise CannotDeleteSelfError("Cannot delete your own user")


def validate_user_is_not_org_owner(organization_repository, user_id: int) -> None:
    """Validate that user is not owner of any organization. Raises UserIsOrganizationOwnerError if owner."""
    if organization_repository is None:
        return
    orgs = organization_repository.find_by_owner_user_id(user_id, skip=0, limit=1000)
    if orgs:
        names = [o.name for o in orgs]
        raise UserIsOrganizationOwnerError(names)
