from sqlalchemy.orm import Session, joinedload
from sqlalchemy import delete, or_, and_
from uuid import UUID
from typing import Optional, List
from app.organizations.infra.organization_model import Organization as OrganizationModel
from app.organizations.infra.organization_member_model import OrganizationMember as OrganizationMemberModel
from app.environments.infra.environment_model import Environment as EnvironmentModel
from app.organizations.infra.group_model import Group as GroupModel
from app.organizations.infra.group_member_model import GroupMember as GroupMemberModel
from app.applications.infra.application_model import Application as ApplicationModel
from app.organizations.core.enums import OrganizationMemberStatus, GroupRole


class OrganizationRepository:
    """Repository for Organization database operations. No business logic here."""

    def __init__(self, database_session: Session):
        self.db = database_session

    def find_by_uuid(self, uuid: UUID) -> Optional[OrganizationModel]:
        """Find organization by UUID with owner, members, environments, and groups (with group members) loaded."""
        return (
            self.db.query(OrganizationModel)
            .options(
                joinedload(OrganizationModel.owner),
                joinedload(OrganizationModel.members).joinedload(OrganizationMemberModel.user),
                joinedload(OrganizationModel.environments),
                joinedload(OrganizationModel.groups).joinedload(GroupModel.organization),
                joinedload(OrganizationModel.groups).joinedload(GroupModel.environment),
                joinedload(OrganizationModel.groups).joinedload(GroupModel.application),
                joinedload(OrganizationModel.groups).joinedload(GroupModel.members).joinedload(
                    GroupMemberModel.organization_member
                ).joinedload(OrganizationMemberModel.user),
            )
            .filter(OrganizationModel.uuid == uuid)
            .first()
        )

    def find_by_name(self, name: str) -> Optional[OrganizationModel]:
        """Find organization by name."""
        return (
            self.db.query(OrganizationModel)
            .filter(OrganizationModel.name == name)
            .first()
        )

    def find_by_name_excluding_uuid(
        self, name: str, exclude_uuid: UUID
    ) -> Optional[OrganizationModel]:
        """Find organization by name excluding a specific UUID."""
        return (
            self.db.query(OrganizationModel)
            .filter(
                OrganizationModel.name == name,
                OrganizationModel.uuid != exclude_uuid
            )
            .first()
        )

    def find_all(
        self, skip: int = 0, limit: int = 100
    ) -> List[OrganizationModel]:
        """Find all organizations with owner, members, environments, and groups loaded."""
        return (
            self.db.query(OrganizationModel)
            .options(
                joinedload(OrganizationModel.owner),
                joinedload(OrganizationModel.members),
                joinedload(OrganizationModel.environments),
                joinedload(OrganizationModel.groups),
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_all(self) -> int:
        """Count all organizations."""
        return self.db.query(OrganizationModel).count()

    def find_by_owner_user_id(
        self, owner_user_id: int, skip: int = 0, limit: int = 100
    ) -> List[OrganizationModel]:
        """Find organizations by owner user ID with owner, members, environments, and groups loaded."""
        return (
            self.db.query(OrganizationModel)
            .options(
                joinedload(OrganizationModel.owner),
                joinedload(OrganizationModel.members),
                joinedload(OrganizationModel.environments),
                joinedload(OrganizationModel.groups),
            )
            .filter(OrganizationModel.owner_user_id == owner_user_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def find_by_user_membership(
        self, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[OrganizationModel]:
        """Find organizations where user is a member (active membership) or owner."""
        # Find organizations where user is owner OR has active membership
        from sqlalchemy import or_

        return (
            self.db.query(OrganizationModel)
            .outerjoin(
                OrganizationMemberModel,
                (OrganizationModel.id == OrganizationMemberModel.organization_id) &
                (OrganizationMemberModel.user_id == user_id)
            )
            .options(
                joinedload(OrganizationModel.owner),
                joinedload(OrganizationModel.members),
                joinedload(OrganizationModel.environments),
                joinedload(OrganizationModel.groups),
            )
            .filter(
                or_(
                    OrganizationModel.owner_user_id == user_id,  # User is owner
                    and_(
                        OrganizationMemberModel.user_id == user_id,
                        OrganizationMemberModel.status == OrganizationMemberStatus.ACTIVE.value
                    )
                )
            )
            .offset(skip)
            .limit(limit)
            .distinct()
            .all()
        )

    def find_by_user_is_org_admin(
        self, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[OrganizationModel]:
        """Find organizations where user is owner or has org admin role (ORG_OWNER or ORG_ADMIN in a group)."""
        return (
            self.db.query(OrganizationModel)
            .outerjoin(
                OrganizationMemberModel,
                (OrganizationModel.id == OrganizationMemberModel.organization_id)
                & (OrganizationMemberModel.user_id == user_id)
                & (OrganizationMemberModel.status == OrganizationMemberStatus.ACTIVE.value),
            )
            .outerjoin(GroupMemberModel, GroupMemberModel.organization_member_id == OrganizationMemberModel.id)
            .outerjoin(GroupModel, GroupModel.id == GroupMemberModel.group_id)
            .options(
                joinedload(OrganizationModel.owner),
                joinedload(OrganizationModel.members),
                joinedload(OrganizationModel.environments),
                joinedload(OrganizationModel.groups),
            )
            .filter(
                or_(
                    OrganizationModel.owner_user_id == user_id,
                    and_(
                        OrganizationMemberModel.id.isnot(None),
                        or_(
                            OrganizationMemberModel.is_owner.is_(True),
                            GroupModel.role.in_([GroupRole.ORG_ADMIN.value]),
                        ),
                    ),
                )
            )
            .offset(skip)
            .limit(limit)
            .distinct()
            .all()
        )

    def create(self, organization: OrganizationModel) -> OrganizationModel:
        """Create a new organization."""
        self.db.add(organization)
        self.db.commit()
        self.db.refresh(organization)
        return organization

    def update(self, organization: OrganizationModel) -> OrganizationModel:
        """Update an existing organization."""
        self.db.commit()
        self.db.refresh(organization)
        return organization

    def delete_by_id(self, organization_id: int) -> None:
        """Delete organization by ID."""
        stmt = delete(OrganizationModel).where(OrganizationModel.id == organization_id)
        self.db.execute(stmt)
        self.db.commit()

    def rollback(self) -> None:
        """Rollback current transaction."""
        self.db.rollback()
