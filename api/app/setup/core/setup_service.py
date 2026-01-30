"""Setup service for initial system configuration."""

import os
from sqlalchemy.orm import Session

from app.users.infra.user_model import User, UserRole
from app.auth.core.auth_service import AuthService


class SetupService:
    """Business logic for system setup."""

    def __init__(self, db: Session):
        self.db = db
        self.auth_service = AuthService()

    def is_initialized(self) -> bool:
        """Check if the system has been initialized (has at least one admin user)."""
        admin_count = (
            self.db.query(User).filter(User.role == UserRole.ADMIN.value).count()
        )
        return admin_count > 0

    def should_skip_setup(self) -> bool:
        """Check if setup should be skipped (for dev environments)."""
        return os.getenv("SKIP_SETUP", "false").lower() == "true"

    def initialize(
        self,
        admin_email: str,
        admin_password: str,
        admin_name: str = "Administrator",
        organization_name: str = "Default Organization",
    ) -> User:
        """
        Initialize the system with the first admin user and a default organization.

        Creates the admin user, then creates a default organization (with default groups
        and initial templates) owned by that user.

        Args:
            admin_email: Email for the admin user
            admin_password: Password for the admin user
            admin_name: Full name for the admin user
            organization_name: Name for the default organization (created after user)

        Returns:
            The created admin user

        Raises:
            ValueError: If the system is already initialized
        """
        if self.is_initialized():
            raise ValueError("System is already initialized")

        # Create admin user
        hashed_password = self.auth_service.get_password_hash(admin_password)
        admin_user = User(
            email=admin_email,
            hashed_password=hashed_password,
            full_name=admin_name,
            role=UserRole.ADMIN.value,
            is_active=True,
        )

        self.db.add(admin_user)
        self.db.commit()
        self.db.refresh(admin_user)

        # Create default organization with groups and initial templates for the new user
        from app.organizations.infra.organization_repository import OrganizationRepository
        from app.users.infra.user_repository import UserRepository
        from app.organizations.core.organization_service import OrganizationService

        org_repository = OrganizationRepository(self.db)
        user_repository = UserRepository(self.db)
        org_service = OrganizationService(
            repository=org_repository,
            user_repository=user_repository,
            database_session=self.db,
        )
        org_service.create_organization_with_defaults(
            organization_name=organization_name,
            owner_user_id=admin_user.id,
        )

        return admin_user
