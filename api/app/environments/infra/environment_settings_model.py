"""Environment settings model: one row per environment, settings as JSON array."""

from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4

from app.shared.database.database import Base
from app.shared.database.types import JSONBCompat


class EnvironmentSettings(Base):
    """One row per environment. settings column is a JSON array of {key, value, description, type}."""

    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid4, unique=True, nullable=False)
    environment_id = Column(
        Integer, ForeignKey("environments.id", ondelete="CASCADE"), nullable=False
    )
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    settings = Column(
        JSONBCompat, nullable=False
    )  # list of {key, value, description, type}

    environment = relationship("Environment", back_populates="environment_settings")
    organization = relationship("Organization", back_populates="environment_settings")
