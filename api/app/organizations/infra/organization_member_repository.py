from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from typing import Optional, List
from app.organizations.infra.organization_member_model import OrganizationMember as OrganizationMemberModel
from app.users.infra.user_model import User as UserModel


class OrganizationMemberRepository:
    """Repository for OrganizationMember database operations. No business logic here."""

    def __init__(self, database_session: Session):
        self.db = database_session

    def find_by_uuid(self, uuid: UUID) -> Optional[OrganizationMemberModel]:
        """Find organization member by UUID with user relationship loaded."""
        return (
            self.db.query(OrganizationMemberModel)
            .options(joinedload(OrganizationMemberModel.user))
            .filter(OrganizationMemberModel.uuid == uuid)
            .first()
        )

    def find_by_organization_id(self, organization_id: int) -> List[OrganizationMemberModel]:
        """Find all organization members for an organization."""
        return (
            self.db.query(OrganizationMemberModel)
            .options(joinedload(OrganizationMemberModel.user))
            .filter(OrganizationMemberModel.organization_id == organization_id)
            .all()
        )

    def find_by_user_and_organization(
        self, user_id: int, organization_id: int
    ) -> Optional[OrganizationMemberModel]:
        """Find organization member by user ID and organization ID."""
        return (
            self.db.query(OrganizationMemberModel)
            .filter(
                OrganizationMemberModel.user_id == user_id,
                OrganizationMemberModel.organization_id == organization_id
            )
            .first()
        )

    def update(self, member: OrganizationMemberModel) -> OrganizationMemberModel:
        """Update an existing organization member."""
        self.db.commit()
        self.db.refresh(member)
        return member

    def delete_by_id(self, member_id: int) -> None:
        """Delete organization member by ID."""
        from sqlalchemy import delete
        stmt = delete(OrganizationMemberModel).where(OrganizationMemberModel.id == member_id)
        self.db.execute(stmt)
        self.db.commit()

    def rollback(self) -> None:
        """Rollback current transaction."""
        self.db.rollback()
