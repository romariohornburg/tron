from sqlalchemy.orm import Session, joinedload
from sqlalchemy import delete
from uuid import UUID
from typing import Optional, List
from app.organizations.infra.group_model import Group as GroupModel
from app.organizations.infra.group_member_model import GroupMember as GroupMemberModel
from app.organizations.infra.organization_member_model import (
    OrganizationMember as OrganizationMemberModel,
)


class GroupRepository:
    """Repository for Group database operations. No business logic here."""

    def __init__(self, database_session: Session):
        self.db = database_session

    def find_by_uuid(self, uuid: UUID) -> Optional[GroupModel]:
        """Find group by UUID with relationships loaded."""
        return (
            self.db.query(GroupModel)
            .options(
                joinedload(GroupModel.organization),
                joinedload(GroupModel.environment),
                joinedload(GroupModel.application),
                joinedload(GroupModel.members)
                .joinedload(GroupMemberModel.organization_member)
                .joinedload(OrganizationMemberModel.user),
            )
            .filter(GroupModel.uuid == uuid)
            .first()
        )

    def find_by_organization_id(
        self, organization_id: int, skip: int = 0, limit: int = 100
    ) -> List[GroupModel]:
        """Find all groups for an organization."""
        return (
            self.db.query(GroupModel)
            .options(
                joinedload(GroupModel.organization),
                joinedload(GroupModel.environment),
                joinedload(GroupModel.application),
            )
            .filter(GroupModel.organization_id == organization_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def find_all(self, skip: int = 0, limit: int = 100) -> List[GroupModel]:
        """Find all groups."""
        return (
            self.db.query(GroupModel)
            .options(
                joinedload(GroupModel.organization),
                joinedload(GroupModel.environment),
                joinedload(GroupModel.application),
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, group: GroupModel) -> GroupModel:
        """Create a new group."""
        self.db.add(group)
        self.db.commit()
        self.db.refresh(group)
        # Reload with relationships
        return (
            self.db.query(GroupModel)
            .options(
                joinedload(GroupModel.organization),
                joinedload(GroupModel.environment),
                joinedload(GroupModel.application),
            )
            .filter(GroupModel.id == group.id)
            .first()
        )

    def update(self, group: GroupModel) -> GroupModel:
        """Update an existing group."""
        self.db.commit()
        self.db.refresh(group)
        # Reload with relationships
        return (
            self.db.query(GroupModel)
            .options(
                joinedload(GroupModel.organization),
                joinedload(GroupModel.environment),
                joinedload(GroupModel.application),
            )
            .filter(GroupModel.id == group.id)
            .first()
        )

    def delete_by_id(self, group_id: int) -> None:
        """Delete group by ID."""
        stmt = delete(GroupModel).where(GroupModel.id == group_id)
        self.db.execute(stmt)
        self.db.commit()

    def rollback(self) -> None:
        """Rollback current transaction."""
        self.db.rollback()
