from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.shared.database.database import get_db
from app.applications.infra.application_repository import ApplicationRepository
from app.applications.core.application_service import ApplicationService
from app.applications.api.application_dto import (
    ApplicationCreate,
    ApplicationUpdate,
    Application,
)
from app.applications.core.application_validators import (
    ApplicationNotFoundError,
    ApplicationNameAlreadyExistsError,
    ApplicationNameProtectedError,
)
from app.users.infra.user_model import User, UserRole
from app.shared.dependencies.auth import require_role, get_current_user
from app.organizations.api.dependencies.organization_context import getOrganizationContext
from app.organizations.core.authorization import (
    OrganizationAccessContext,
    isOrgAdmin,
    canViewApplication,
    canManageApplication,
    canDeployApplication,
    canViewApplicationByUuid,
    canManageApplicationByUuid,
    canDeployApplicationByUuid,
    isOrgMember,
    canViewEnvironment
)


router = APIRouter(prefix="/organizations/{organization_uuid}/applications", tags=["applications"])


def get_application_service(
    database_session: Session = Depends(get_db),
) -> ApplicationService:
    """Dependency to get ApplicationService instance."""
    from app.instances.infra.instance_repository import InstanceRepository
    from app.instances.core.instance_service import InstanceService

    application_repository = ApplicationRepository(database_session)
    instance_repository = InstanceRepository(database_session)
    instance_service = InstanceService(instance_repository, database_session)
    return ApplicationService(application_repository, instance_service)


@router.post("/", response_model=Application)
def create_application(
    organization_uuid: UUID,
    application: ApplicationCreate,
    service: ApplicationService = Depends(get_application_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Create a new application within an organization."""
    # Only org admins can create applications
    if not isOrgMember(ctx):
        raise HTTPException(status_code=403, detail="Only organization members can create applications")

    try:
        return service.create_application(application, ctx.organization.id)
    except ApplicationNameAlreadyExistsError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ApplicationNameProtectedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{uuid}", response_model=Application)
def update_application(
    organization_uuid: UUID,
    uuid: UUID,
    application: ApplicationUpdate,
    service: ApplicationService = Depends(get_application_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    db: Session = Depends(get_db),
):
    """Update an existing application."""
    # Verify user has permission to manage this application (helper also verifies it belongs to org)
    if not (isOrgAdmin(ctx) or canManageApplicationByUuid(ctx, uuid, db)):
        raise HTTPException(status_code=403, detail="Not allowed to update this application")

    try:
        return service.update_application(uuid, application, ctx.organization.id)
    except ApplicationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ApplicationNameAlreadyExistsError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ApplicationNameProtectedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[Application])
def list_applications(
    organization_uuid: UUID,
    skip: int = 0,
    limit: int = 100,
    service: ApplicationService = Depends(get_application_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    db: Session = Depends(get_db),
):
    """List all applications for an organization that the user has permission to view."""
    from app.organizations.core.authorization import isOrgAdmin, canViewApplication

    # If user is org admin, return all applications
    if isOrgAdmin(ctx):
        return service.get_applications(skip=skip, limit=limit, organization_id=ctx.organization.id)

    # Otherwise, filter applications based on user's groups and permissions
    # Get all applications for the organization
    all_applications = service.get_all_applications_by_organization(ctx.organization.id)

    # Filter applications the user can view
    viewable_applications = [
        app for app in all_applications
        if canViewApplication(ctx, app.id)
    ]

    # Apply pagination
    paginated_applications = viewable_applications[skip:skip + limit]

    # Convert to DTOs
    return [Application.model_validate(app) for app in paginated_applications]


@router.get("/{uuid}", response_model=Application)
def get_application(
    organization_uuid: UUID,
    uuid: UUID,
    service: ApplicationService = Depends(get_application_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    db: Session = Depends(get_db),
):
    """Get application by UUID."""
    # Verify user has permission to view this application (helper also verifies it belongs to org)
    if not canViewApplicationByUuid(ctx, uuid, db):
        raise HTTPException(status_code=403, detail="Not allowed to view this application")

    try:
        application = service.get_application(uuid)
        return application
    except ApplicationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{uuid}", response_model=dict)
def delete_application(
    organization_uuid: UUID,
    uuid: UUID,
    service: ApplicationService = Depends(get_application_service),
    database_session: Session = Depends(get_db),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Delete an application."""
    # Verify user has permission to manage this application (helper also verifies it belongs to org)
    if not (isOrgMember(ctx)):
        raise HTTPException(status_code=403, detail="Not allowed to delete this application")

    try:
        return service.delete_application(uuid, database_session)
    except ApplicationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
