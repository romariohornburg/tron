from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.shared.database.database import get_db
from app.templates.infra.template_repository import TemplateRepository
from app.templates.core.template_service import TemplateService
from app.templates.api.template_dto import TemplateCreate, TemplateUpdate, Template
from app.templates.core.template_validators import TemplateNotFoundError
from app.organizations.api.dependencies.organization_context import getOrganizationContext
from app.organizations.core.authorization import OrganizationAccessContext, isOrgAdmin


router = APIRouter(prefix="/organizations/{organization_uuid}/templates", tags=["templates"])


def get_template_service(
    database_session: Session = Depends(get_db),
) -> TemplateService:
    """Dependency to get TemplateService instance."""
    template_repository = TemplateRepository(database_session)
    return TemplateService(template_repository)


@router.post("/", response_model=Template)
def create_template(
    organization_uuid: UUID,
    template: TemplateCreate,
    service: TemplateService = Depends(get_template_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Create a new template. Only organization admins can create templates."""
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can create templates")

    try:
        return service.create_template(template, ctx.organization.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{uuid}", response_model=Template)
def update_template(
    organization_uuid: UUID,
    uuid: UUID,
    template: TemplateUpdate,
    service: TemplateService = Depends(get_template_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Update an existing template. Only organization admins can update templates."""
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can update templates")

    # Verify template belongs to organization
    template_model = service.repository.find_by_uuid(uuid)
    if not template_model or template_model.organization_id != ctx.organization.id:
        raise HTTPException(status_code=404, detail="Template not found")

    try:
        return service.update_template(uuid, template)
    except TemplateNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[Template])
def list_templates(
    organization_uuid: UUID,
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = Query(None, description="Filter by category"),
    service: TemplateService = Depends(get_template_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """List all templates for the organization."""
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can list templates")

    return service.get_templates(skip=skip, limit=limit, category=category, organization_id=ctx.organization.id)


@router.get("/{uuid}", response_model=Template)
def get_template(
    organization_uuid: UUID,
    uuid: UUID,
    service: TemplateService = Depends(get_template_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Get template by UUID."""
    try:
        template_model = service.repository.find_by_uuid(uuid)
        if not template_model or template_model.organization_id != ctx.organization.id:
            raise HTTPException(status_code=404, detail="Template not found")
        return service.get_template(uuid)
    except TemplateNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{uuid}", response_model=dict)
def delete_template(
    organization_uuid: UUID,
    uuid: UUID,
    service: TemplateService = Depends(get_template_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Delete a template. Only organization admins can delete templates."""
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can delete templates")

    # Verify template belongs to organization
    template_model = service.repository.find_by_uuid(uuid)
    if not template_model or template_model.organization_id != ctx.organization.id:
        raise HTTPException(status_code=404, detail="Template not found")

    try:
        return service.delete_template(uuid)
    except TemplateNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
