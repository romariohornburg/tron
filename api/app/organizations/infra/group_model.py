from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Enum as SAEnum,
    CheckConstraint,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from app.shared.database.database import Base
from app.organizations.core.enums import ScopeLevel, GroupRole


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid4, unique=True, nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    scope_level = Column(
        SAEnum(
            ScopeLevel,
            name="scope_level_enum",
            native_enum=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
    )
    environment_id = Column(Integer, ForeignKey("environments.id"), nullable=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    role = Column(
        SAEnum(
            GroupRole,
            name="group_role_enum",
            native_enum=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
    )
    is_default = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    organization = relationship("Organization", back_populates="groups")
    environment = relationship("Environment", foreign_keys=[environment_id])
    application = relationship("Application", foreign_keys=[application_id])
    members = relationship("GroupMember", back_populates="group")

    __table_args__ = (
        CheckConstraint(
            "(scope_level = 'org' AND environment_id IS NULL AND application_id IS NULL) "
            "OR (scope_level = 'environment' AND environment_id IS NOT NULL AND application_id IS NULL) "
            "OR (scope_level = 'application' AND application_id IS NOT NULL)",
            name="groups_scope_consistency",
        ),
    )
