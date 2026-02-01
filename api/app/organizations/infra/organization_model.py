from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from app.shared.database.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid4, unique=True, nullable=False)
    name = Column(String, nullable=False)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    owner = relationship("User", foreign_keys=[owner_user_id])
    members = relationship("OrganizationMember", back_populates="organization")
    groups = relationship("Group", back_populates="organization")
    applications = relationship("Application", back_populates="organization")
    environments = relationship("Environment", back_populates="organization")
    templates = relationship("Template", back_populates="organization")
    component_template_configs = relationship(
        "ComponentTemplateConfig", back_populates="organization"
    )
    settings = relationship("Settings", back_populates="organization")
