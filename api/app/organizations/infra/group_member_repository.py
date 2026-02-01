from sqlalchemy.orm import Session, joinedload
from sqlalchemy import delete
from uuid import UUID
from typing import Optional, List
from app.organizations.infra.group_member_model import GroupMember as GroupMemberModel
from app.organizations.infra.organization_member_model import (
    OrganizationMember as OrganizationMemberModel,
)


class GroupMemberRepository:
    """Repository for GroupMember database operations. No business logic here."""

    def __init__(self, database_session: Session):
        self.db = database_session

    def find_by_uuid(self, uuid: UUID) -> Optional[GroupMemberModel]:
        """Find group member by UUID with relationships loaded."""
        return (
            self.db.query(GroupMemberModel)
            .options(
                joinedload(GroupMemberModel.group),
                joinedload(GroupMemberModel.organization_member).joinedload(
                    OrganizationMemberModel.user
                ),
            )
            .filter(GroupMemberModel.uuid == uuid)
            .first()
        )

    def find_by_group_id(self, group_id: int) -> List[GroupMemberModel]:
        """Find all group members for a group."""
        return (
            self.db.query(GroupMemberModel)
            .options(
                joinedload(GroupMemberModel.group),
                joinedload(GroupMemberModel.organization_member).joinedload(
                    OrganizationMemberModel.user
                ),
            )
            .filter(GroupMemberModel.group_id == group_id)
            .all()
        )

    def find_by_group_and_organization_member(
        self, group_id: int, organization_member_id: int
    ) -> Optional[GroupMemberModel]:
        """Find group member by group ID and organization member ID."""
        return (
            self.db.query(GroupMemberModel)
            .filter(
                GroupMemberModel.group_id == group_id,
                GroupMemberModel.organization_member_id == organization_member_id,
            )
            .first()
        )

    def find_by_organization_member_id(
        self, organization_member_id: int
    ) -> List[GroupMemberModel]:
        """Find all group members for an organization member."""
        return (
            self.db.query(GroupMemberModel)
            .filter(GroupMemberModel.organization_member_id == organization_member_id)
            .all()
        )

    def create(self, group_member: GroupMemberModel) -> GroupMemberModel:
        """Create a new group member."""
        self.db.add(group_member)
        self.db.commit()
        self.db.refresh(group_member)
        return group_member

    def delete_by_id(self, group_member_id: int) -> None:
        """Delete group member by ID."""
        stmt = delete(GroupMemberModel).where(GroupMemberModel.id == group_member_id)
        self.db.execute(stmt)
        self.db.commit()

    def rollback(self) -> None:
        """Rollback current transaction."""
        self.db.rollback()
