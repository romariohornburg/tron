from uuid import uuid4, UUID
from typing import List
from sqlalchemy.orm import Session

from app.organizations.infra.group_member_repository import GroupMemberRepository
from app.organizations.infra.group_member_model import GroupMember as GroupMemberModel
from app.organizations.infra.group_repository import GroupRepository
from app.organizations.infra.organization_member_repository import (
    OrganizationMemberRepository,
)
from app.organizations.api.group_member_dto import (
    GroupMemberCreate,
    GroupMember,
)
from app.organizations.core.group_validators import GroupNotFoundError


class GroupMemberNotFoundError(Exception):
    """Raised when group member is not found."""

    pass


class GroupMemberAlreadyExistsError(Exception):
    """Raised when group member already exists."""

    pass


class OrganizationMemberNotFoundError(Exception):
    """Raised when organization member is not found."""

    pass


class GroupMemberService:
    """Business logic for group members. No direct database access."""

    def __init__(
        self,
        repository: GroupMemberRepository,
        group_repository: GroupRepository,
        organization_member_repository: OrganizationMemberRepository,
        database_session: Session,
    ):
        self.repository = repository
        self.group_repository = group_repository
        self.organization_member_repository = organization_member_repository
        self.db = database_session

    def add_member_to_group(self, dto: GroupMemberCreate) -> GroupMember:
        """Add an organization member to a group."""
        # Validate group exists
        group = self.group_repository.find_by_uuid(dto.group_id)
        if not group:
            raise GroupNotFoundError(f"Group with UUID '{dto.group_id}' not found")

        # Validate organization member exists
        org_member = self.organization_member_repository.find_by_uuid(
            dto.organization_member_id
        )
        if not org_member:
            raise OrganizationMemberNotFoundError(
                f"Organization member with UUID '{dto.organization_member_id}' not found"
            )

        # Check if already a member
        existing = self.repository.find_by_group_and_organization_member(
            group.id, org_member.id
        )
        if existing:
            raise GroupMemberAlreadyExistsError(
                "Organization member is already in this group"
            )

        # Create group member
        group_member = self._build_group_member_entity(group.id, org_member.id)
        return self.repository.create(group_member)

    def remove_member_from_group(self, uuid: UUID) -> dict:
        """Remove an organization member from a group."""
        group_member = self.repository.find_by_uuid(uuid)
        if not group_member:
            raise GroupMemberNotFoundError(f"Group member with UUID '{uuid}' not found")

        try:
            self.repository.delete_by_id(group_member.id)
            return {"detail": "Member removed from group successfully"}
        except Exception as e:
            self.repository.rollback()
            raise Exception(f"Failed to remove member from group: {str(e)}")

    def get_group_members(self, group_uuid: UUID) -> List[GroupMember]:
        """Get all members of a group."""
        group = self.group_repository.find_by_uuid(group_uuid)
        if not group:
            raise GroupNotFoundError(f"Group with UUID '{group_uuid}' not found")

        return self.repository.find_by_group_id(group.id)

    def _build_group_member_entity(
        self, group_id: int, organization_member_id: int
    ) -> GroupMemberModel:
        """Build GroupMember entity."""
        return GroupMemberModel(
            uuid=uuid4(),
            group_id=group_id,
            organization_member_id=organization_member_id,
        )
