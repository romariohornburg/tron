from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from app.shared.database.database import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid4, unique=True, nullable=False)
    name = Column(String, nullable=False)
    repository = Column(String, nullable=True)
    enabled = Column(Boolean, nullable=False, default=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)

    # Kubernetes namespace for this application
    # - Legacy apps (pre-v0.6): namespace = name (no prefix)
    # - New apps (v0.6+): namespace = tron-ns-{name} (with prefix)
    # This field is internal and NOT exposed to users
    namespace = Column(String, unique=True, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), server_onupdate=func.now(), nullable=False
    )

    organization = relationship("Organization", back_populates="applications")
    instances = relationship("Instance", back_populates="application")
    groups = relationship("Group", back_populates="application")

    __table_args__ = (UniqueConstraint("organization_id", "name", name="uix_application_org_name"),)
