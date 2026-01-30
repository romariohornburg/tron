from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from app.shared.database.database import Base
from app.organizations.core.enums import OrganizationMemberStatus


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid4, unique=True, nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_owner = Column(Boolean, default=False, nullable=False)
    status = Column(
        SAEnum(OrganizationMemberStatus, name="organization_member_status_enum", native_enum=True, create_constraint=True, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=OrganizationMemberStatus.ACTIVE.value,
    )

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    organization = relationship("Organization", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    group_members = relationship("GroupMember", back_populates="organization_member")

    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uix_organization_member"),
    )
