from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional

from app.shared.database.database import get_db
from app.instances.infra.instance_repository import InstanceRepository
from app.instances.core.instance_service import InstanceService
from app.instances.api.instance_dto import (
    InstanceCreate,
    InstanceUpdate,
    Instance,
    KubernetesEvent,
)
from app.instances.core.instance_validators import (
    InstanceNotFoundError,
    InstanceAlreadyExistsError,
    ApplicationNotFoundError,
    EnvironmentNotFoundError,
)
from app.users.infra.user_model import User
from app.shared.dependencies.auth import get_current_user
from app.organizations.api.dependencies.organization_context import (
    getOrganizationContext,
)
from app.organizations.core.authorization import (
    OrganizationAccessContext,
    canCreateInstance,
    canViewInstanceByUuid,
    canViewEnvironment,
    canViewApplication,
    canOperateInstanceByUuid,
    isOrgMember,
)

router = APIRouter(
    prefix="/organizations/{organization_uuid}/instances", tags=["instances"]
)


def get_instance_service(
    database_session: Session = Depends(get_db),
) -> InstanceService:
    """Dependency to get InstanceService instance."""
    instance_repository = InstanceRepository(database_session)
    return InstanceService(instance_repository, database_session)


@router.post("/", response_model=Instance)
def create_instance(
    organization_uuid: UUID,
    instance: InstanceCreate,
    service: InstanceService = Depends(get_instance_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Create a new instance."""
    try:
        environment_id = service.get_environment_id_for_organization(
            instance.environment_uuid, ctx.organization.id
        )
    except EnvironmentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    if not canCreateInstance(ctx, environment_id):
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions to create instance in this environment",
        )
    try:
        return service.create_instance(instance, ctx.organization.id)
    except (ApplicationNotFoundError, EnvironmentNotFoundError) as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InstanceAlreadyExistsError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{uuid}", response_model=Instance)
def update_instance(
    organization_uuid: UUID,
    uuid: UUID,
    instance: InstanceUpdate,
    service: InstanceService = Depends(get_instance_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Update an existing instance."""
    # First check if instance exists and belongs to organization
    repository = InstanceRepository(service.db)
    instance_model = repository.find_by_uuid_with_relations(uuid)

    if not instance_model:
        raise HTTPException(status_code=404, detail="Instance not found")

    # Verify instance belongs to organization
    if instance_model.application.organization_id != ctx.organization.id:
        raise HTTPException(status_code=404, detail="Instance not found")

    # Then verify user has permission to operate this instance
    if not canOperateInstanceByUuid(ctx, uuid, service.db):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        return service.update_instance(uuid, instance)
    except InstanceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[Instance])
def list_instances(
    organization_uuid: UUID,
    skip: int = 0,
    limit: int = 100,
    application_uuid: Optional[UUID] = Query(
        None, description="Filter instances by application UUID"
    ),
    service: InstanceService = Depends(get_instance_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """List all instances for the organization. Optionally filter by application UUID."""
    repository = InstanceRepository(service.db)

    # If application_uuid provided, validate application exists and belongs to organization
    if application_uuid is not None:
        application = repository.find_application_by_uuid(application_uuid)
        if not application or application.organization_id != ctx.organization.id:
            raise HTTPException(status_code=404, detail="Application not found")

    # Get all instance models with relations for the organization (optionally by application)
    instance_models = repository.find_by_organization_id(
        ctx.organization.id,
        skip=0,
        limit=10000,
        application_uuid=application_uuid,
    )

    # If user is organization member, return all instances (already filtered by application if requested)
    if isOrgMember(ctx):
        # Use service method to serialize (handles secrets stripping)
        all_instances = service.get_instances(
            skip=0,
            limit=10000,
            organization_id=ctx.organization.id,
            application_uuid=application_uuid,
        )
        return all_instances[skip : skip + limit]

    # If not a member, filter instances by application or environment access
    filtered_models = []
    for instance_model in instance_models:
        if canViewApplication(ctx, instance_model.application_id) or canViewEnvironment(
            ctx, instance_model.environment_id
        ):
            filtered_models.append(instance_model)

    # Serialize filtered instances (strip secrets and convert to DTO)
    # Use the same serialization logic as service.get_instances
    filtered_instances = []
    for instance_model in filtered_models:
        # Strip secrets from components (same as service._strip_secrets_from_instance)
        from app.shared.crypto import strip_secrets_from_settings

        if hasattr(instance_model, "components") and instance_model.components:
            for component in instance_model.components:
                if component.settings:
                    component.settings = strip_secrets_from_settings(component.settings)
        # Convert to DTO
        filtered_instances.append(Instance.model_validate(instance_model))

    # Apply pagination
    return filtered_instances[skip : skip + limit]


@router.get("/{uuid}", response_model=Instance)
def get_instance(
    organization_uuid: UUID,
    uuid: UUID,
    service: InstanceService = Depends(get_instance_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Get instance by UUID."""
    # Load instance to check permissions
    repository = InstanceRepository(service.db)
    instance_model = repository.find_by_uuid_with_relations(uuid)

    if not instance_model:
        raise HTTPException(status_code=404, detail="Instance not found")

    # Verify instance belongs to organization
    if instance_model.application.organization_id != ctx.organization.id:
        raise HTTPException(status_code=404, detail="Instance not found")

    # Check permissions: can view instance (checks environment) OR can view application
    if not (
        canViewInstanceByUuid(ctx, uuid, service.db)
        or canViewApplication(ctx, instance_model.application_id)
    ):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        return service.get_instance(uuid)
    except InstanceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{uuid}", response_model=dict)
def delete_instance(
    organization_uuid: UUID,
    uuid: UUID,
    service: InstanceService = Depends(get_instance_service),
    database_session: Session = Depends(get_db),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Delete an instance."""
    if not isOrgMember(ctx):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        return service.delete_instance(uuid, database_session)
    except InstanceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{uuid}/events", response_model=List[KubernetesEvent])
def get_instance_events(
    organization_uuid: UUID,
    uuid: UUID,
    service: InstanceService = Depends(get_instance_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Get Kubernetes events for an instance."""
    if canViewInstanceByUuid(ctx, uuid, service.db):
        pass
    else:
        repo = InstanceRepository(service.db)
        inst = repo.find_by_uuid_with_relations(uuid)
        if (
            not inst
            or not inst.application
            or inst.application.organization_id != ctx.organization.id
        ):
            raise HTTPException(status_code=404, detail="Instance not found")
        if not (
            canViewApplication(ctx, inst.application_id)
            or canViewEnvironment(ctx, inst.environment_id)
        ):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        return service.get_instance_events(uuid)
    except InstanceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting instance events: {e!s}",
        )


@router.post("/{uuid}/sync", response_model=dict)
def sync_instance(
    organization_uuid: UUID,
    uuid: UUID,
    service: InstanceService = Depends(get_instance_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Sync instance components with Kubernetes."""
    if not canOperateInstanceByUuid(ctx, uuid, service.db):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        return service.sync_instance(uuid)
    except InstanceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error syncing instance: {e!s}")
