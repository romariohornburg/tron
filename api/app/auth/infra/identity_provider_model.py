from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from uuid import uuid4

from app.shared.database.database import Base


class IdentityProvider(Base):
    """OAuth2/OIDC identity provider configuration (Google, Microsoft, etc.)."""

    __tablename__ = "identity_providers"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid4, unique=True, nullable=False)
    slug = Column(String(64), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    client_id = Column(String(512), nullable=False)
    client_secret_encrypted = Column(Text, nullable=True)
    authorization_url = Column(String(1024), nullable=False)
    token_url = Column(String(1024), nullable=False)
    userinfo_url = Column(String(1024), nullable=True)
    scopes = Column(String(512), nullable=False, default="openid email profile")
    is_enabled = Column(Boolean, default=True, nullable=False)

    # Optional: for future per-organization providers
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    organization = relationship("Organization", backref="identity_providers")

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user_social_accounts = relationship(
        "UserSocialAccount", back_populates="identity_provider"
    )
