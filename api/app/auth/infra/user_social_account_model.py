from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.shared.database.database import Base


class UserSocialAccount(Base):
    """Links a User to an identity provider (e.g. Google sub)."""

    __tablename__ = "user_social_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    identity_provider_id = Column(
        Integer, ForeignKey("identity_providers.id", ondelete="CASCADE"), nullable=False
    )
    provider_user_id = Column(String(255), nullable=False)
    provider_email = Column(String(512), nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "identity_provider_id",
            "provider_user_id",
            name="uix_identity_provider_provider_user_id",
        ),
    )

    user = relationship("User", backref="social_accounts")
    identity_provider = relationship(
        "IdentityProvider", back_populates="user_social_accounts"
    )
