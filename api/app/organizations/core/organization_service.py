from uuid import uuid4, UUID
from typing import List
from sqlalchemy.orm import Session

from app.organizations.infra.organization_repository import OrganizationRepository
from app.organizations.infra.organization_model import Organization as OrganizationModel
from app.organizations.infra.organization_member_model import (
    OrganizationMember as OrganizationMemberModel,
)
from app.organizations.infra.organization_member_repository import (
    OrganizationMemberRepository,
)
from app.organizations.api.organization_dto import (
    OrganizationCreate,
    OrganizationUpdate,
    Organization,
)
from app.organizations.core.organization_validators import (
    validate_organization_create_dto,
    validate_organization_update_dto,
    validate_organization_exists,
    validate_organization_name_uniqueness,
    validate_user_exists,
    UserNotFoundError,
)
from app.users.infra.user_repository import UserRepository
from app.organizations.core.enums import OrganizationMemberStatus, GroupRole
from app.organizations.infra.group_model import Group as GroupModel
from app.organizations.infra.group_member_model import GroupMember as GroupMemberModel


class OrganizationService:
    """Business logic for organizations. No direct database access."""

    def __init__(
        self,
        repository: OrganizationRepository,
        user_repository: UserRepository,
        database_session: Session,
    ):
        self.repository = repository
        self.user_repository = user_repository
        self.db = database_session

    def create_organization(
        self, dto: OrganizationCreate, owner_user_id: int
    ) -> Organization:
        """Create a new organization with default groups. The given user becomes the owner."""
        validate_organization_create_dto(dto)
        validate_organization_name_uniqueness(self.repository, dto.name)

        # Use create_organization_with_defaults to create organization with default groups
        organization_model = self.create_organization_with_defaults(
            dto.name, owner_user_id
        )

        # Reload organization with relationships for DTO serialization
        organization = self.repository.find_by_uuid(organization_model.uuid)
        if not organization:
            raise ValueError("Failed to retrieve created organization")

        # Ensure relationships are loaded for DTO serialization
        if organization.owner:
            _ = organization.owner.uuid
        if organization.members:
            for member in organization.members:
                if member.user:
                    _ = member.user.uuid
                if member.organization:
                    _ = member.organization.uuid
        if organization.groups:
            for group in organization.groups:
                _ = group.uuid
                if group.organization:
                    _ = group.organization.uuid
                if group.environment:
                    _ = group.environment.uuid
                if group.application:
                    _ = group.application.uuid

        return organization

    def update_organization(self, uuid: UUID, dto: OrganizationUpdate) -> Organization:
        """Update an existing organization. Can update name and/or owner."""
        validate_organization_update_dto(dto)
        validate_organization_exists(self.repository, uuid)

        organization = self.repository.find_by_uuid(uuid)
        member_repo = OrganizationMemberRepository(self.db)

        if dto.name is not None:
            validate_organization_name_uniqueness(
                self.repository, dto.name, exclude_uuid=uuid
            )
            organization.name = dto.name

        if dto.owner_user_id is not None:
            validate_user_exists(self.user_repository, dto.owner_user_id)
            new_owner_user = self.user_repository.find_by_uuid(dto.owner_user_id)
            if not new_owner_user:
                raise UserNotFoundError(
                    f"User with UUID '{dto.owner_user_id}' not found"
                )
            new_owner_user_id = new_owner_user.id
            old_owner_user_id = organization.owner_user_id

            if old_owner_user_id != new_owner_user_id:
                old_owner_member = member_repo.find_by_user_and_organization(
                    old_owner_user_id, organization.id
                )
                if old_owner_member:
                    old_owner_member.is_owner = False
                    member_repo.update(old_owner_member)

                organization.owner_user_id = new_owner_user_id

                new_owner_member = member_repo.find_by_user_and_organization(
                    new_owner_user_id, organization.id
                )
                if new_owner_member:
                    new_owner_member.is_owner = True
                    member_repo.update(new_owner_member)
                else:
                    new_owner_member = self._build_owner_member(
                        organization.id, new_owner_user_id
                    )
                    self.db.add(new_owner_member)
                    self.db.flush()
                    self.db.refresh(new_owner_member)
                    org_groups = (
                        self.db.query(GroupModel)
                        .filter(
                            GroupModel.organization_id == organization.id,
                            GroupModel.environment_id.is_(None),
                        )
                        .all()
                    )
                    for group in org_groups:
                        gm = GroupMemberModel(
                            uuid=uuid4(),
                            group_id=group.id,
                            organization_member_id=new_owner_member.id,
                        )
                        self.db.add(gm)

        return self.repository.update(organization)

    def get_organization(self, uuid: UUID) -> Organization:
        """Get organization by UUID."""
        validate_organization_exists(self.repository, uuid)
        org = self.repository.find_by_uuid(uuid)
        # Ensure owner relationship is loaded for DTO serialization
        if org and org.owner:
            # Access owner to ensure it's loaded
            _ = org.owner.uuid
        # Ensure members relationships are loaded for DTO serialization
        if org and org.members:
            for member in org.members:
                # Access user and organization to ensure they're loaded
                if member.user:
                    _ = member.user.uuid
                if member.organization:
                    _ = member.organization.uuid
        # Ensure environments relationships are loaded for DTO serialization
        if org and org.environments:
            for environment in org.environments:
                # Access environment to ensure it's loaded
                _ = environment.uuid
        # Ensure groups relationships are loaded for DTO serialization
        if org and org.groups:
            for group in org.groups:
                # Access group relationships to ensure they're loaded
                _ = group.uuid
                if group.organization:
                    _ = group.organization.uuid
                if group.environment:
                    _ = group.environment.uuid
                if group.application:
                    _ = group.application.uuid
        return org

    def get_organizations(
        self, skip: int = 0, limit: int = 100, user_id: int | None = None
    ) -> List[Organization]:
        """Get organizations. If user_id is provided, returns only organizations where user is a member."""
        if user_id is not None:
            orgs = self.repository.find_by_user_membership(
                user_id, skip=skip, limit=limit
            )
        else:
            orgs = self.repository.find_all(skip=skip, limit=limit)
        # Ensure owner relationships are loaded
        for org in orgs:
            if org.owner:
                _ = org.owner.uuid
        return orgs

    def get_organizations_by_owner(
        self, owner_user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Organization]:
        """Get organizations by owner user ID."""
        return self.repository.find_by_owner_user_id(
            owner_user_id, skip=skip, limit=limit
        )

    def get_organizations_where_user_is_admin(
        self, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Organization]:
        """Get organizations where user is owner or has org admin role (isOrgAdmin)."""
        return self.repository.find_by_user_is_org_admin(
            user_id, skip=skip, limit=limit
        )

    def delete_organization(self, uuid: UUID) -> dict:
        """Delete an organization."""
        validate_organization_exists(self.repository, uuid)

        organization = self.repository.find_by_uuid(uuid)

        # TODO: Check if organization has applications, environments, etc.
        # For now, we'll allow deletion but this should be validated

        try:
            self.repository.delete_by_id(organization.id)
            return {"detail": "Organization deleted successfully"}
        except Exception as e:
            self.repository.rollback()
            raise Exception(f"Failed to delete organization: {str(e)}")

    def _build_organization_entity(
        self, dto: OrganizationCreate, owner_user_id: int
    ) -> OrganizationModel:
        """Build Organization entity from DTO."""
        return OrganizationModel(
            uuid=uuid4(),
            name=dto.name,
            owner_user_id=owner_user_id,
        )

    def create_organization_with_defaults(
        self, organization_name: str, owner_user_id: int
    ) -> OrganizationModel:
        """
        Create an organization with default groups and add owner as member.

        Creates:
        - Organization
        - OrganizationMember for owner (is_owner=True)
        - Default groups: ORG_ADMIN, ORG_BILLING, ORG_MEMBER
        - GroupMembers linking owner to all default groups

        Args:
            organization_name: Name of the organization
            owner_user_id: Internal user ID (not UUID) of the owner

        Returns:
            Created Organization entity
        """
        # Note: owner_user_id is already validated in create_organization before calling this method
        # The user existence is validated via foreign key constraint at database level

        # Create organization (add to session but don't commit yet)
        organization = OrganizationModel(
            uuid=uuid4(),
            name=organization_name,
            owner_user_id=owner_user_id,
        )
        self.db.add(organization)
        self.db.flush()  # Flush to get the ID without committing
        self.db.refresh(organization)

        # Create organization member for owner
        owner_member = self._build_owner_member(organization.id, owner_user_id)
        self.db.add(owner_member)
        self.db.flush()  # Flush to get the ID without committing
        self.db.refresh(owner_member)

        # Create default groups - all organization-level groups
        default_groups = [
            (
                GroupRole.ORG_ADMIN,
                "Organization Admin",
                "Administrative access to organization",
            ),
            (
                GroupRole.ORG_BILLING,
                "Organization Billing",
                "Access to billing information",
            ),
            (GroupRole.ORG_MEMBER, "Organization Member", "Basic member access"),
        ]

        created_groups = []
        for role, name, description in default_groups:
            # Use string literals directly to avoid SAEnum conversion issues
            group = GroupModel(
                uuid=uuid4(),
                organization_id=organization.id,
                name=name,
                description=description,
                scope_level="org",  # Use string literal directly
                environment_id=None,
                application_id=None,
                role=role.value,  # Use enum value (e.g., 'ORG_ADMIN')
                is_default=True,
            )
            self.db.add(group)
            self.db.flush()
            self.db.refresh(group)
            created_groups.append(group)

        # Link owner to all default groups
        for group in created_groups:
            group_member = GroupMemberModel(
                uuid=uuid4(),
                group_id=group.id,
                organization_member_id=owner_member.id,
            )
            self.db.add(group_member)

        # Seed initial Kubernetes templates for the organization (same transaction)
        from app.templates.core.initial_templates_service import (
            seed_templates_for_organization,
        )

        seed_templates_for_organization(self.db, organization.id)

        # Commit all changes
        try:
            self.db.commit()
            self.db.refresh(organization)
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to commit organization creation: {str(e)}") from e

        return organization

    def add_member_to_organization(
        self, organization_uuid: UUID, user_uuid: UUID
    ) -> OrganizationMemberModel:
        """Add a user as a member to an organization."""

        # Validate organization exists
        organization = self.repository.find_by_uuid(organization_uuid)
        if not organization:
            raise ValueError(f"Organization with UUID '{organization_uuid}' not found")

        # Validate user exists
        user = self.user_repository.find_by_uuid(user_uuid)
        if not user:
            raise ValueError(f"User with UUID '{user_uuid}' not found")

        # Check if user is already a member
        member_repo = OrganizationMemberRepository(self.db)
        existing_member = member_repo.find_by_user_and_organization(
            user.id, organization.id
        )
        if existing_member:
            raise ValueError("User is already a member of this organization")

        # Create organization member
        member = OrganizationMemberModel(
            uuid=uuid4(),
            organization_id=organization.id,
            user_id=user.id,
            is_owner=False,
            status=OrganizationMemberStatus.ACTIVE.value,
        )
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)

        return member

    def _validate_member_belongs_to_organization(
        self, member: OrganizationMemberModel, organization: OrganizationModel
    ) -> None:
        """Validate that member belongs to organization."""
        if member.organization_id != organization.id:
            raise ValueError("Member does not belong to this organization")

    def _check_has_other_owners(
        self, organization_id: int, exclude_member_id: int
    ) -> bool:
        """Check if organization has other owners besides the excluded member."""
        other_owners_count = (
            self.db.query(OrganizationMemberModel)
            .filter(
                OrganizationMemberModel.organization_id == organization_id,
                OrganizationMemberModel.is_owner == True,  # noqa: E712
                OrganizationMemberModel.id != exclude_member_id,
            )
            .count()
        )
        return other_owners_count > 0

    def _validate_owner_status_change(
        self,
        member: OrganizationMemberModel,
        organization: OrganizationModel,
        new_is_owner: bool,
    ) -> None:
        """Validate that removing owner status is allowed."""
        if member.is_owner and not new_is_owner:
            if not self._check_has_other_owners(organization.id, member.id):
                raise ValueError(
                    "Cannot remove owner status: organization must have at least one owner"
                )

    def update_member(
        self, organization_uuid: UUID, member_uuid: UUID, dto
    ) -> OrganizationMemberModel:
        """Update an organization member."""

        organization = self.repository.find_by_uuid(organization_uuid)
        if not organization:
            raise ValueError(f"Organization with UUID '{organization_uuid}' not found")

        member_repo = OrganizationMemberRepository(self.db)
        member = member_repo.find_by_uuid(member_uuid)
        if not member:
            raise ValueError(f"Organization member with UUID '{member_uuid}' not found")

        self._validate_member_belongs_to_organization(member, organization)

        # Do not allow deactivating the organization owner
        if dto.status is not None:
            new_status = (
                dto.status.value if hasattr(dto.status, "value") else dto.status
            )
            if (
                member.is_owner
                and new_status == OrganizationMemberStatus.DISABLED.value
            ):
                raise ValueError("Cannot deactivate the organization owner")

        # Update status if provided
        if dto.status is not None:
            member.status = (
                dto.status.value if hasattr(dto.status, "value") else dto.status
            )

        # Update owner status if provided
        if dto.is_owner is not None:
            self._validate_owner_status_change(member, organization, dto.is_owner)
            member.is_owner = dto.is_owner

        return member_repo.update(member)

    def _remove_member_from_all_groups(self, member_id: int) -> None:
        """Remove member from all groups."""
        from app.organizations.infra.group_member_repository import (
            GroupMemberRepository,
        )

        group_member_repo = GroupMemberRepository(self.db)
        group_members = group_member_repo.find_by_organization_member_id(member_id)
        for gm in group_members:
            group_member_repo.delete_by_id(gm.id)

    def remove_member(self, organization_uuid: UUID, member_uuid: UUID) -> dict:
        """Remove a member from an organization."""
        organization = self.repository.find_by_uuid(organization_uuid)
        if not organization:
            raise ValueError(f"Organization with UUID '{organization_uuid}' not found")

        member_repo = OrganizationMemberRepository(self.db)
        member = member_repo.find_by_uuid(member_uuid)
        if not member:
            raise ValueError(f"Organization member with UUID '{member_uuid}' not found")

        self._validate_member_belongs_to_organization(member, organization)

        # Prevent removing the only owner
        if member.is_owner and not self._check_has_other_owners(
            organization.id, member.id
        ):
            raise ValueError("Cannot remove the only owner of the organization")

        # Remove member from all groups first
        self._remove_member_from_all_groups(member.id)

        # Delete the member
        member_repo.delete_by_id(member.id)

        return {"detail": "Member removed successfully"}

    def _build_owner_member(
        self, organization_id: int, user_id: int
    ) -> OrganizationMemberModel:
        """Build OrganizationMember entity for owner."""
        from uuid import uuid4 as uuid_gen

        return OrganizationMemberModel(
            uuid=uuid_gen(),
            organization_id=organization_id,
            user_id=user_id,
            is_owner=True,
            status=OrganizationMemberStatus.ACTIVE.value,
        )
