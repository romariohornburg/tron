from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.shared.database.database import get_db
from app.dashboard.infra.dashboard_repository import DashboardRepository
from app.dashboard.core.dashboard_service import DashboardService
from app.dashboard.api.dashboard_dto import DashboardOverview
from app.users.infra.user_model import User
from app.shared.dependencies.auth import get_current_user
from app.organizations.api.dependencies.organization_context import getOrganizationContext
from app.organizations.core.authorization import (
    OrganizationAccessContext,
    isOrgAdmin,
    isOrgMember,
    canViewApplication,
    canViewEnvironment,
    isAppDeveloper,
    isAppMaintainer,
)
from app.applications.infra.application_repository import ApplicationRepository
from app.applications.core.application_service import ApplicationService
from app.instances.infra.instance_repository import InstanceRepository


router = APIRouter(prefix="/organizations/{organization_uuid}/dashboard", tags=["dashboard"])


def get_dashboard_service(
    database_session: Session = Depends(get_db),
) -> DashboardService:
    """Dependency to get DashboardService instance."""
    dashboard_repository = DashboardRepository(database_session)
    return DashboardService(dashboard_repository)


@router.get("/", response_model=DashboardOverview)
def get_dashboard_overview(
    organization_uuid: UUID,
    service: DashboardService = Depends(get_dashboard_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    db: Session = Depends(get_db),
):
    """
    Get dashboard overview with statistics about applications, instances, components, clusters, and environments for an organization.
    Only shows statistics for resources the user has permission to view.
    """
    # If user is org admin or org member, return all statistics
    if isOrgAdmin(ctx) or isOrgMember(ctx):
        return service.get_dashboard_overview(organization_id=ctx.organization.id)

    # Otherwise, filter statistics based on user's permissions
    viewable_application_ids, viewable_environment_ids = _collect_viewable_resources(
        ctx, db
    )

    # Get dashboard overview filtered by viewable applications and environments
    return service.get_dashboard_overview(
        viewable_application_ids=list(viewable_application_ids),
        viewable_environment_ids=list(viewable_environment_ids)
    )


def _collect_viewable_resources(
    ctx: OrganizationAccessContext, db: Session
) -> tuple[set[int], set[int]]:
    """Collect application and environment IDs that the user can view."""
    application_repository = ApplicationRepository(db)
    application_service = ApplicationService(application_repository, None)
    all_applications = application_service.get_all_applications_by_organization(
        ctx.organization.id
    )

    # Applications user can view directly (via canViewApplication, isAppDeveloper, or isAppMaintainer)
    viewable_application_ids = set([
        app.id for app in all_applications
        if canViewApplication(ctx, app.id)
        or isAppDeveloper(ctx, app.id)
        or isAppMaintainer(ctx, app.id)
    ])

    # Get all instances to determine accessible environments
    instance_repository = InstanceRepository(db)
    all_instances = instance_repository.find_by_organization_id(
        ctx.organization.id, skip=0, limit=10000
    )

    # Track viewable environment IDs
    viewable_environment_ids = set()

    # Add environments where user has direct environment-level access
    for instance in all_instances:
        if canViewEnvironment(ctx, instance.environment_id):
            viewable_application_ids.add(instance.application_id)
            viewable_environment_ids.add(instance.environment_id)

    # For applications user can access via isAppDeveloper/isAppMaintainer,
    # include all environments where those applications have instances
    # (so instances/components are counted correctly)
    for instance in all_instances:
        if instance.application_id in viewable_application_ids:
            # Check if user has app-level access (not just canViewApplication)
            has_app_level_access = (
                isAppDeveloper(ctx, instance.application_id)
                or isAppMaintainer(ctx, instance.application_id)
            )
            # If user has app-level access, include the environment
            if has_app_level_access:
                viewable_environment_ids.add(instance.environment_id)

    return viewable_application_ids, viewable_environment_ids
