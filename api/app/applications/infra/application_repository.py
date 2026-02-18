from sqlalchemy.orm import Session, joinedload
from sqlalchemy import delete
from uuid import UUID
from typing import Optional, List
from app.applications.infra.application_model import Application as ApplicationModel


class ApplicationRepository:
    """Repository for Application database operations. No business logic here."""

    def __init__(self, database_session: Session):
        self.db = database_session

    def find_by_uuid(self, uuid: UUID) -> Optional[ApplicationModel]:
        """Find application by UUID."""
        return (
            self.db.query(ApplicationModel)
            .filter(ApplicationModel.uuid == uuid)
            .first()
        )

    def find_by_name(self, name: str) -> Optional[ApplicationModel]:
        """Find application by name."""
        return (
            self.db.query(ApplicationModel)
            .filter(ApplicationModel.name == name)
            .first()
        )

    def find_by_name_excluding_uuid(
        self, name: str, exclude_uuid: UUID
    ) -> Optional[ApplicationModel]:
        """Find application by name excluding a specific UUID."""
        return (
            self.db.query(ApplicationModel)
            .filter(
                ApplicationModel.name == name, ApplicationModel.uuid != exclude_uuid
            )
            .first()
        )

    def find_all_with_instances(
        self, skip: int = 0, limit: int = 100
    ) -> List[ApplicationModel]:
        """Find all applications with instances loaded."""
        return (
            self.db.query(ApplicationModel)
            .options(joinedload(ApplicationModel.instances))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def find_all(self, skip: int = 0, limit: int = 100) -> List[ApplicationModel]:
        """Find all applications."""
        return self.db.query(ApplicationModel).offset(skip).limit(limit).all()

    def find_by_organization_id(
        self,
        organization_id: int,
        skip: int = 0,
        limit: int = 100,
        name: Optional[str] = None,
    ) -> List[ApplicationModel]:
        """Find all applications for a specific organization.
        Optionally filter by name (case-insensitive partial match)."""
        query = self.db.query(ApplicationModel).filter(
            ApplicationModel.organization_id == organization_id
        )
        if name is not None and name.strip():
            query = query.filter(ApplicationModel.name.ilike(f"%{name.strip()}%"))
        return query.offset(skip).limit(limit).all()

    def find_all_by_organization_id(
        self, organization_id: int, name: Optional[str] = None
    ) -> List[ApplicationModel]:
        """Find all applications for a specific organization without pagination.
        Optionally filter by name (case-insensitive partial match)."""
        query = self.db.query(ApplicationModel).filter(
            ApplicationModel.organization_id == organization_id
        )
        if name is not None and name.strip():
            query = query.filter(ApplicationModel.name.ilike(f"%{name.strip()}%"))
        return query.all()

    def find_by_name_and_organization(
        self, name: str, organization_id: int
    ) -> Optional[ApplicationModel]:
        """Find application by name within a specific organization."""
        return (
            self.db.query(ApplicationModel)
            .filter(
                ApplicationModel.name == name,
                ApplicationModel.organization_id == organization_id,
            )
            .first()
        )

    def find_by_name_and_organization_excluding_uuid(
        self, name: str, organization_id: int, exclude_uuid: UUID
    ) -> Optional[ApplicationModel]:
        """Find application by name within organization excluding a specific UUID."""
        return (
            self.db.query(ApplicationModel)
            .filter(
                ApplicationModel.name == name,
                ApplicationModel.organization_id == organization_id,
                ApplicationModel.uuid != exclude_uuid,
            )
            .first()
        )

    def create(self, application: ApplicationModel) -> ApplicationModel:
        """Create a new application."""
        self.db.add(application)
        self.db.commit()
        self.db.refresh(application)
        return application

    def update(self, application: ApplicationModel) -> ApplicationModel:
        """Update an existing application."""
        # Ensure created_at is not modified during update
        # Store original created_at to prevent SQLAlchemy from trying to update it
        original_created_at = application.created_at
        self.db.commit()
        # Restore created_at in case it was modified
        if (
            hasattr(application, "created_at")
            and application.created_at != original_created_at
        ):
            application.created_at = original_created_at
        self.db.refresh(application)
        return application

    def delete_by_id(self, application_id: int) -> None:
        """Delete application by ID."""
        stmt = delete(ApplicationModel).where(ApplicationModel.id == application_id)
        self.db.execute(stmt)
        self.db.commit()

    def rollback(self) -> None:
        """Rollback current transaction."""
        self.db.rollback()
