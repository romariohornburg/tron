from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.shared.database.database import get_db
from app.settings.infra.settings_repository import SettingsRepository
from app.settings.core.settings_service import SettingsService
from app.settings.api.settings_dto import (
    SettingsCreate,
    SettingsUpdate,
    Settings,
    SettingsWithEnvironment,
)
from app.settings.core.settings_validators import (
    SettingsNotFoundError,
    EnvironmentNotFoundError,
    SettingsKeyAlreadyExistsError,
)
from app.organizations.api.dependencies.organization_context import getOrganizationContext
from app.organizations.core.authorization import (
    OrganizationAccessContext,
    isOrgAdmin,
)


router = APIRouter(prefix="/organizations/{organization_uuid}", tags=["settings"])


def get_settings_service(
    database_session: Session = Depends(get_db),
) -> SettingsService:
    """Dependency to get SettingsService instance."""
    settings_repository = SettingsRepository(database_session)
    return SettingsService(settings_repository)


@router.post("/settings", response_model=Settings)
def create_settings(
    organization_uuid: UUID,
    setting: SettingsCreate,
    service: SettingsService = Depends(get_settings_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Create a new settings. Only organization admins can create settings."""
    if not isOrgAdmin(ctx):
        raise HTTPException(
            status_code=403, detail="Only organization admins can create settings"
        )
    try:
        return service.create_settings(setting, ctx.organization.id)
    except (EnvironmentNotFoundError, SettingsKeyAlreadyExistsError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/settings/{uuid}", response_model=Settings)
def update_settings(
    organization_uuid: UUID,
    uuid: UUID,
    setting: SettingsUpdate,
    service: SettingsService = Depends(get_settings_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Update an existing settings. Only organization admins can update settings."""
    if not isOrgAdmin(ctx):
        raise HTTPException(
            status_code=403, detail="Only organization admins can update settings"
        )
    try:
        return service.update_settings(uuid, setting, ctx.organization.id)
    except SettingsNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except (SettingsKeyAlreadyExistsError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/settings/", response_model=list[SettingsWithEnvironment])
def list_settings(
    organization_uuid: UUID,
    skip: int = 0,
    limit: int = 100,
    service: SettingsService = Depends(get_settings_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """List all settings for the organization."""
    return service.get_settings_list(
        skip=skip, limit=limit, organization_id=ctx.organization.id
    )


@router.get("/settings/{uuid}", response_model=SettingsWithEnvironment)
def get_settings(
    organization_uuid: UUID,
    uuid: UUID,
    service: SettingsService = Depends(get_settings_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Get settings by UUID. Verifies settings belongs to organization."""
    try:
        return service.get_settings(uuid, ctx.organization.id)
    except SettingsNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/settings/{uuid}", response_model=dict)
def delete_settings(
    organization_uuid: UUID,
    uuid: UUID,
    service: SettingsService = Depends(get_settings_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Delete a settings. Only organization admins can delete settings."""
    if not isOrgAdmin(ctx):
        raise HTTPException(
            status_code=403, detail="Only organization admins can delete settings"
        )
    try:
        return service.delete_settings(uuid, ctx.organization.id)
    except SettingsNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
