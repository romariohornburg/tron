from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.shared.database.database import get_db
from app.cron.infra.cron_repository import CronRepository
from app.cron.core.cron_service import CronService
from app.environments.infra.environment_settings_repository import (
    EnvironmentSettingsRepository,
)
from app.cron.api.cron_dto import CronCreate, CronUpdate, Cron, CronJob, CronJobLogs
from app.cron.core.cron_validators import (
    CronNotFoundError,
    CronNotCronTypeError,
    InstanceNotFoundError,
)
from app.webapps.core.webapp_validators import EnvironmentSettingsValidationError
from app.cron.core.cron_jobs_service import (
    get_cron_jobs_from_cluster,
    get_cron_job_logs_from_cluster,
    delete_cron_job_from_cluster,
)
from app.users.infra.user_model import UserRole, User
from app.shared.dependencies.auth import require_role, get_current_user
from app.organizations.api.dependencies.organization_context import (
    getOrganizationContext,
)
from app.organizations.core.authorization import (
    OrganizationAccessContext,
    canViewApplication,
    canManageApplication,
    canViewEnvironment,
    isEnvMaintainer,
    isEnvOperator,
    isAppDeveloper,
    isAppMaintainer,
)


router = APIRouter(
    prefix="/organizations/{organization_uuid}/application_components/cron",
    tags=["cron"],
)


def get_cron_service(database_session: Session = Depends(get_db)) -> CronService:
    """Dependency to get CronService instance."""
    cron_repository = CronRepository(database_session)
    settings_repository = EnvironmentSettingsRepository(database_session)
    return CronService(cron_repository, database_session, settings_repository)


@router.post("/", response_model=Cron)
def create_cron(
    organization_uuid: UUID,
    cron: CronCreate,
    service: CronService = Depends(get_cron_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Create a new cron."""
    # Validate instance belongs to organization; allow create by application or by env maintainer
    from app.instances.infra.instance_repository import InstanceRepository

    instance_repo = InstanceRepository(service.db)
    instance = instance_repo.find_by_uuid(cron.instance_uuid)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    if instance.application.organization_id != ctx.organization.id:
        raise HTTPException(
            status_code=403, detail="Instance does not belong to this organization"
        )

    if (
        not canManageApplication(ctx, instance.application_id)
        and not isEnvMaintainer(ctx, instance.environment_id)
        and not isAppMaintainer(ctx, instance.application_id)
    ):
        raise HTTPException(
            status_code=403, detail="Insufficient permissions to manage applications"
        )

    try:
        return service.create_cron(cron)
    except (InstanceNotFoundError, EnvironmentSettingsValidationError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[Cron])
def list_crons(
    organization_uuid: UUID,
    skip: int = 0,
    limit: int = 100,
    service: CronService = Depends(get_cron_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """List all crons for the organization."""
    # Get crons filtered by organization
    return service.get_crons_by_organization(
        ctx.organization.id, skip=skip, limit=limit
    )


@router.get("/{uuid}", response_model=Cron)
def get_cron(
    organization_uuid: UUID,
    uuid: UUID,
    service: CronService = Depends(get_cron_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Get cron by UUID."""
    try:
        repository = CronRepository(service.db)
        cron_model = repository.find_by_uuid(uuid, load_relations=True)
        if not cron_model:
            raise HTTPException(status_code=404, detail="Cron not found")
        if cron_model.type.value != "cron":
            raise HTTPException(status_code=404, detail="Cron not found")
        # Validate cron belongs to organization; allow view by application or by environment
        if cron_model.instance and cron_model.instance.application:
            if cron_model.instance.application.organization_id != ctx.organization.id:
                raise HTTPException(status_code=404, detail="Cron not found")
            if not canViewApplication(
                ctx, cron_model.instance.application_id
            ) and not canViewEnvironment(ctx, cron_model.instance.environment_id):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
        return service.get_cron(uuid)
    except (CronNotFoundError, CronNotCronTypeError) as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{uuid}", response_model=Cron)
def update_cron(
    organization_uuid: UUID,
    uuid: UUID,
    cron: CronUpdate,
    service: CronService = Depends(get_cron_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Update an existing cron."""
    try:
        repository = CronRepository(service.db)
        cron_model = repository.find_by_uuid(uuid, load_relations=True)
        if not cron_model or cron_model.type.value != "cron":
            raise HTTPException(status_code=404, detail="Cron not found")
        if cron_model.instance and cron_model.instance.application:
            if cron_model.instance.application.organization_id != ctx.organization.id:
                raise HTTPException(status_code=404, detail="Cron not found")
            if (
                not canManageApplication(ctx, cron_model.instance.application_id)
                and not isEnvOperator(ctx, cron_model.instance.environment_id)
                and not isAppDeveloper(ctx, cron_model.instance.application_id)
            ):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
        return service.update_cron(uuid, cron)
    except (CronNotFoundError, CronNotCronTypeError) as e:
        raise HTTPException(status_code=404, detail=str(e))
    except EnvironmentSettingsValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{uuid}")
def delete_cron(
    organization_uuid: UUID,
    uuid: UUID,
    service: CronService = Depends(get_cron_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Delete a cron."""
    try:
        repository = CronRepository(service.db)
        cron_model = repository.find_by_uuid(uuid, load_relations=True)
        if not cron_model or cron_model.type.value != "cron":
            raise HTTPException(status_code=404, detail="Cron not found")
        # Validate cron belongs to organization; allow delete by application or by env maintainer
        if cron_model.instance and cron_model.instance.application:
            if cron_model.instance.application.organization_id != ctx.organization.id:
                raise HTTPException(status_code=404, detail="Cron not found")
            if (
                not canManageApplication(ctx, cron_model.instance.application_id)
                and not isEnvMaintainer(ctx, cron_model.instance.environment_id)
                and not isAppMaintainer(ctx, cron_model.instance.application_id)
            ):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
        return service.delete_cron(uuid)
    except (CronNotFoundError, CronNotCronTypeError) as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{uuid}/secrets")
def get_cron_secrets(
    organization_uuid: UUID,
    uuid: UUID,
    service: CronService = Depends(get_cron_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """
    Get decrypted secrets for a cron.
    Admin only endpoint - returns plaintext secret values.

    Security: This endpoint is protected by admin role requirement.
    All access is logged for audit purposes.
    """
    import logging
    from app.shared.crypto import decrypt_secret

    logger = logging.getLogger(__name__)

    try:
        repository = CronRepository(service.db)
        cron = repository.find_by_uuid(uuid, load_relations=True)
        if not cron or cron.type.value != "cron":
            raise HTTPException(status_code=404, detail="Cron not found")
        # Validate cron belongs to organization
        if cron.instance and cron.instance.application:
            if cron.instance.application.organization_id != ctx.organization.id:
                raise HTTPException(status_code=404, detail="Cron not found")
            if not canManageApplication(ctx, cron.instance.application_id):
                raise HTTPException(status_code=403, detail="Insufficient permissions")

        # Audit log: Admin accessing secrets
        logger.info(
            f"SECURITY_AUDIT: Admin '{current_user.email}' accessed secrets "
            f"for cron '{cron.name}' (uuid: {uuid})"
        )

        settings = cron.settings or {}
        encrypted_secrets = settings.get("secrets", [])

        decrypted_secrets = []
        for secret in encrypted_secrets:
            try:
                decrypted_value = decrypt_secret(secret.get("value", ""))
                decrypted_secrets.append(
                    {"key": secret.get("key", ""), "value": decrypted_value}
                )
            except Exception as e:
                logger.warning(
                    f"SECURITY_AUDIT: Failed to decrypt secret '{secret.get('key')}' "
                    f"for cron {uuid}: {type(e).__name__}"
                )
                decrypted_secrets.append(
                    {"key": secret.get("key", ""), "value": "********"}
                )

        return {"secrets": decrypted_secrets}
    except (CronNotFoundError, CronNotCronTypeError) as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{uuid}/jobs", response_model=list[CronJob])
def get_cron_jobs(
    organization_uuid: UUID,
    uuid: UUID,
    database_session: Session = Depends(get_db),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Get jobs for a cron."""
    repository = CronRepository(database_session)
    cron = repository.find_by_uuid(uuid, load_relations=True)

    if not cron:
        raise HTTPException(status_code=404, detail="Cron not found")

    if cron.type.value != "cron":
        raise HTTPException(status_code=400, detail="Component is not a cron")

    # Validate cron belongs to organization; allow view by application or by environment
    if cron.instance and cron.instance.application:
        if cron.instance.application.organization_id != ctx.organization.id:
            raise HTTPException(status_code=404, detail="Cron not found")
        if not canViewApplication(
            ctx, cron.instance.application_id
        ) and not canViewEnvironment(ctx, cron.instance.environment_id):
            raise HTTPException(status_code=403, detail="Insufficient permissions")

    cluster_instance = repository.find_cluster_instance_by_component_id(cron.id)
    if not cluster_instance:
        raise HTTPException(
            status_code=404, detail="Cron is not deployed to any cluster"
        )

    cluster = cluster_instance.cluster
    # Use namespace from database (supports both legacy and new apps)
    application = cron.instance.application
    namespace = application.namespace if application.namespace else application.name
    component_name = cron.name

    try:
        jobs = get_cron_jobs_from_cluster(cluster, namespace, component_name)
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get jobs: {str(e)}")


@router.get("/{uuid}/jobs/{job_name}/logs", response_model=CronJobLogs)
def get_cron_job_logs(
    organization_uuid: UUID,
    uuid: UUID,
    job_name: str,
    container_name: str = None,
    tail_lines: int = 100,
    database_session: Session = Depends(get_db),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Get logs for a cron job."""
    repository = CronRepository(database_session)
    cron = repository.find_by_uuid(uuid, load_relations=True)

    if not cron:
        raise HTTPException(status_code=404, detail="Cron not found")

    if cron.type.value != "cron":
        raise HTTPException(status_code=400, detail="Component is not a cron")

    # Validate cron belongs to organization; allow view by application or by environment
    if cron.instance and cron.instance.application:
        if cron.instance.application.organization_id != ctx.organization.id:
            raise HTTPException(status_code=404, detail="Cron not found")
        if not canViewApplication(
            ctx, cron.instance.application_id
        ) and not canViewEnvironment(ctx, cron.instance.environment_id):
            raise HTTPException(status_code=403, detail="Insufficient permissions")

    cluster_instance = repository.find_cluster_instance_by_component_id(cron.id)
    if not cluster_instance:
        raise HTTPException(
            status_code=404, detail="Cron is not deployed to any cluster"
        )

    cluster = cluster_instance.cluster
    # Use namespace from database (supports both legacy and new apps)
    application = cron.instance.application
    namespace = application.namespace if application.namespace else application.name

    try:
        result = get_cron_job_logs_from_cluster(
            cluster, namespace, job_name, container_name, tail_lines
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get logs for job {job_name}: {str(e)}"
        )


@router.delete("/{uuid}/jobs/{job_name}")
def delete_cron_job(
    organization_uuid: UUID,
    uuid: UUID,
    job_name: str,
    database_session: Session = Depends(get_db),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    current_user: User = Depends(get_current_user),
):
    """Delete a cron job."""
    repository = CronRepository(database_session)
    cron = repository.find_by_uuid(uuid, load_relations=True)

    if not cron:
        raise HTTPException(status_code=404, detail="Cron not found")

    if cron.type.value != "cron":
        raise HTTPException(status_code=400, detail="Component is not a cron")

    # Validate cron belongs to organization; allow delete by application or by env maintainer
    if cron.instance and cron.instance.application:
        if cron.instance.application.organization_id != ctx.organization.id:
            raise HTTPException(status_code=404, detail="Cron not found")
        if (
            not canManageApplication(ctx, cron.instance.application_id)
            and not isEnvMaintainer(ctx, cron.instance.environment_id)
            and not isAppMaintainer(ctx, cron.instance.application_id)
        ):
            raise HTTPException(status_code=403, detail="Insufficient permissions")

    cluster_instance = repository.find_cluster_instance_by_component_id(cron.id)
    if not cluster_instance:
        raise HTTPException(
            status_code=404, detail="Cron is not deployed to any cluster"
        )

    cluster = cluster_instance.cluster
    # Use namespace from database (supports both legacy and new apps)
    application = cron.instance.application
    namespace = application.namespace if application.namespace else application.name

    try:
        delete_cron_job_from_cluster(cluster, namespace, job_name)
        return {"detail": f"Job '{job_name}' deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete job {job_name}: {str(e)}"
        )
