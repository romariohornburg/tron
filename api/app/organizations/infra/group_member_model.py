from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from app.shared.database.database import Base


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid4, unique=True, nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    organization_member_id = Column(Integer, ForeignKey("organization_members.id"), nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    group = relationship("Group", back_populates="members")
    organization_member = relationship("OrganizationMember", back_populates="group_members")

    __table_args__ = (
        UniqueConstraint("group_id", "organization_member_id", name="uix_group_member"),
    )
