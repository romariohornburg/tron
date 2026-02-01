from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.shared.database.database import get_db
from app.organizations.infra.group_repository import GroupRepository
from app.organizations.infra.organization_repository import OrganizationRepository
from app.environments.infra.environment_repository import EnvironmentRepository
from app.applications.infra.application_repository import ApplicationRepository
from app.organizations.core.group_service import GroupService
from app.organizations.api.group_dto import (
    GroupCreate,
    GroupUpdate,
    Group,
)
from app.organizations.core.group_validators import (
    GroupNotFoundError,
    OrganizationNotFoundError,
    EnvironmentNotFoundError,
    ApplicationNotFoundError,
)
from app.organizations.api.dependencies.organization_context import (
    getOrganizationContext,
)
from app.organizations.core.authorization import isOrgAdmin


router = APIRouter(prefix="/organizations/{organization_uuid}/groups", tags=["groups"])


def get_group_service(
    database_session: Session = Depends(get_db),
) -> GroupService:
    """Dependency to get GroupService instance."""
    group_repository = GroupRepository(database_session)
    organization_repository = OrganizationRepository(database_session)
    environment_repository = EnvironmentRepository(database_session)
    application_repository = ApplicationRepository(database_session)
    return GroupService(
        group_repository,
        organization_repository,
        environment_repository,
        application_repository,
        database_session,
    )


@router.post("/", response_model=Group)
def create_group(
    organization_uuid: UUID,
    group: GroupCreate,
    service: GroupService = Depends(get_group_service),
    ctx=Depends(getOrganizationContext),
):
    """Create a new group. Only organization admins can create groups."""
    if not isOrgAdmin(ctx):
        raise HTTPException(
            status_code=403, detail="Only organization admins can create groups"
        )

    # Ensure organization_uuid matches
    if group.organization_id != organization_uuid:
        raise HTTPException(status_code=400, detail="Organization UUID mismatch")

    try:
        return service.create_group(group)
    except OrganizationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except EnvironmentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ApplicationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{uuid}", response_model=Group)
def update_group(
    organization_uuid: UUID,
    uuid: UUID,
    group: GroupUpdate,
    service: GroupService = Depends(get_group_service),
    ctx=Depends(getOrganizationContext),
):
    """Update an existing group. Only organization admins can update groups."""
    if not isOrgAdmin(ctx):
        raise HTTPException(
            status_code=403, detail="Only organization admins can update groups"
        )

    # Verify group belongs to organization
    existing_group = service.get_group(uuid)
    if existing_group.organization_id != ctx.organization.id:
        raise HTTPException(status_code=404, detail="Group not found")

    try:
        return service.update_group(uuid, group)
    except GroupNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except EnvironmentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ApplicationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[Group])
def list_groups(
    organization_uuid: UUID,
    skip: int = 0,
    limit: int = 100,
    service: GroupService = Depends(get_group_service),
    ctx=Depends(getOrganizationContext),
):
    """List all groups for an organization."""
    if not isOrgAdmin(ctx):
        raise HTTPException(
            status_code=403, detail="Only organization admins can list groups"
        )

    try:
        return service.get_groups_by_organization(
            organization_uuid, skip=skip, limit=limit
        )
    except OrganizationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{uuid}", response_model=Group)
def get_group(
    organization_uuid: UUID,
    uuid: UUID,
    service: GroupService = Depends(get_group_service),
    ctx=Depends(getOrganizationContext),
):
    """Get group by UUID."""
    try:
        group = service.get_group(uuid)
        # Verify group belongs to organization
        if group.organization_id != ctx.organization.id:
            raise HTTPException(status_code=404, detail="Group not found")
        return group
    except GroupNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{uuid}", response_model=dict)
def delete_group(
    organization_uuid: UUID,
    uuid: UUID,
    service: GroupService = Depends(get_group_service),
    ctx=Depends(getOrganizationContext),
):
    """Delete a group. Only organization admins can delete groups."""
    if not isOrgAdmin(ctx):
        raise HTTPException(
            status_code=403, detail="Only organization admins can delete groups"
        )

    # Verify group belongs to organization
    existing_group = service.get_group(uuid)
    if existing_group.organization_id != ctx.organization.id:
        raise HTTPException(status_code=404, detail="Group not found")

    try:
        return service.delete_group(uuid)
    except GroupNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
