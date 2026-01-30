from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import UUID

from app.shared.database.database import get_db
from app.environments.infra.environment_repository import EnvironmentRepository
from app.environments.core.environment_service import EnvironmentService
from app.environments.api.environment_dto import (
    EnvironmentCreate,
    Environment,
    EnvironmentWithClusters,
)
from app.environments.core.environment_validators import (
    EnvironmentNotFoundError,
    EnvironmentHasComponentsError,
)
from app.users.infra.user_model import User, UserRole
from app.shared.dependencies.auth import require_role, get_current_user
from app.organizations.api.dependencies.organization_context import getOrganizationContext
from app.organizations.core.authorization import (
    OrganizationAccessContext,
    canViewEnvironment,
    canManageEnvironment,
    canDeployToEnvironment,
    canViewEnvironmentByUuid,
    canManageEnvironmentByUuid,
    canDeployToEnvironmentByUuid,
    isOrgAdmin,
    isOrgMember,
)


router = APIRouter(prefix="/organizations/{organization_uuid}/environments", tags=["environments"])


def get_environment_service(
    database_session: Session = Depends(get_db),
) -> EnvironmentService:
    """Dependency to get EnvironmentService instance."""
    environment_repository = EnvironmentRepository(database_session)
    return EnvironmentService(environment_repository)


@router.post("/", response_model=Environment)
def create_environment(
    organization_uuid: UUID,
    environment: EnvironmentCreate,
    service: EnvironmentService = Depends(get_environment_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Create a new environment within an organization."""
    # Only org admins can create environments
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can create environments")

    try:
        return service.create_environment(environment, ctx.organization.id)
    except IntegrityError:
        # Handle unique constraint violations (e.g., duplicate name)
        service.repository.rollback()
        raise HTTPException(
            status_code=400, detail="Environment with this name already exists in this organization"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{uuid}", response_model=Environment)
def update_environment(
    organization_uuid: UUID,
    uuid: UUID,
    environment: EnvironmentCreate,
    service: EnvironmentService = Depends(get_environment_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    db: Session = Depends(get_db),
):
    """Update an existing environment within an organization."""
    # Verify user has permission to manage this environment (helper also verifies it belongs to org)
    if not (isOrgAdmin(ctx) or canManageEnvironmentByUuid(ctx, uuid, db)):
        raise HTTPException(status_code=403, detail="Not allowed to update this environment")

    try:
        return service.update_environment(uuid, environment, ctx.organization.id)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except IntegrityError:
        # Handle unique constraint violations (e.g., duplicate name)
        service.repository.rollback()
        raise HTTPException(
            status_code=400, detail="Environment with this name already exists in this organization"
        )


@router.get("/", response_model=list[EnvironmentWithClusters])
def list_environments(
    organization_uuid: UUID,
    skip: int = 0,
    limit: int = 100,
    service: EnvironmentService = Depends(get_environment_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """List all environments within an organization."""
    if not isOrgMember(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can list environments")

    return service.get_environments(ctx.organization.id, skip=skip, limit=limit)


@router.get("/{uuid}", response_model=EnvironmentWithClusters)
def get_environment(
    organization_uuid: UUID,
    uuid: UUID,
    service: EnvironmentService = Depends(get_environment_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    db: Session = Depends(get_db),
):
    """Get environment by UUID within an organization."""
    # Verify user has permission to view this environment
    if not canViewEnvironmentByUuid(ctx, uuid, db):
        raise HTTPException(status_code=403, detail="Not allowed to view this environment")

    try:
        environment = service.get_environment(uuid, ctx.organization.id)
        return environment
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{uuid}", response_model=dict)
def delete_environment(
    organization_uuid: UUID,
    uuid: UUID,
    service: EnvironmentService = Depends(get_environment_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    db: Session = Depends(get_db),
):
    """Delete an environment within an organization."""
    # Verify user has permission to manage this environment (helper also verifies it belongs to org)
    if not (isOrgAdmin(ctx) or canManageEnvironmentByUuid(ctx, uuid, db)):
        raise HTTPException(status_code=403, detail="Not allowed to delete this environment")

    try:
        return service.delete_environment(uuid, ctx.organization.id)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except EnvironmentHasComponentsError as e:
        raise HTTPException(status_code=400, detail=str(e))
