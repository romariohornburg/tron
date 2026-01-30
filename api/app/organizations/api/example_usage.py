"""
Example usage of the multi-tenant authorization layer.

This file serves as documentation and example of how to use
the authorization helpers in FastAPI endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from sqlalchemy.orm import Session

from app.shared.database.database import get_db
from app.organizations.api.dependencies.organization_context import getOrganizationContext
from app.organizations.core.authorization import (
    OrganizationAccessContext,
    canViewEnvironment,
    canDeployToEnvironment,
    canViewApplication,
    canDeployApplication,
    canManageApplication,
    isOrgAdmin,
    canViewBilling,
)

# Example router
router = APIRouter(prefix="/organizations/{organization_uuid}", tags=["organizations"])


@router.get("/environments/{environment_uuid}")
def getEnvironment(
    organization_uuid: UUID,
    environment_uuid: UUID,
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    db: Session = Depends(get_db),
):
    """
    Example: Check permission to view environment.
    
    Note: You will need to convert environment_uuid to environment_id
    using the repository before calling canViewEnvironment.
    """
    # First, fetch the environment by UUID and verify it belongs to the organization
    from app.environments.infra.environment_model import Environment
    
    environment = db.query(Environment).filter(
        Environment.uuid == environment_uuid,
        Environment.organization_id == ctx.organization.id
    ).first()
    
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    # Check permission using the environment ID
    if not canViewEnvironment(ctx, environment.id):
        raise HTTPException(status_code=403, detail="Not allowed to view this environment")
    
    # Return the environment
    return environment


@router.post("/environments/{environment_uuid}/deploy")
def deployToEnvironment(
    organization_uuid: UUID,
    environment_uuid: UUID,
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    db: Session = Depends(get_db),
):
    """
    Example: Check permission to deploy to environment.
    """
    from app.environments.infra.environment_model import Environment
    
    environment = db.query(Environment).filter(
        Environment.uuid == environment_uuid,
        Environment.organization_id == ctx.organization.id
    ).first()
    
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    if not canDeployToEnvironment(ctx, environment.id):
        raise HTTPException(status_code=403, detail="Not allowed to deploy to this environment")
    
    # Deploy logic here
    return {"message": "Deploy initiated"}


@router.get("/applications/{application_uuid}")
def getApplication(
    organization_uuid: UUID,
    application_uuid: UUID,
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    db: Session = Depends(get_db),
):
    """
    Example: Check permission to view application.
    """
    from app.applications.infra.application_model import Application
    
    application = db.query(Application).filter(
        Application.uuid == application_uuid,
        Application.organization_id == ctx.organization.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if not canViewApplication(ctx, application.id):
        raise HTTPException(status_code=403, detail="Not allowed to view this application")
    
    return application


@router.post("/applications/{application_uuid}/deploy")
def deployApplication(
    organization_uuid: UUID,
    application_uuid: UUID,
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    db: Session = Depends(get_db),
):
    """
    Example: Check permission to deploy application.
    """
    from app.applications.infra.application_model import Application
    
    application = db.query(Application).filter(
        Application.uuid == application_uuid,
        Application.organization_id == ctx.organization.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if not canDeployApplication(ctx, application.id):
        raise HTTPException(status_code=403, detail="Not allowed to deploy this application")
    
    # Deploy logic here
    return {"message": "Deploy initiated"}


@router.put("/applications/{application_uuid}")
def updateApplication(
    organization_uuid: UUID,
    application_uuid: UUID,
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
    db: Session = Depends(get_db),
):
    """
    Example: Check permission to manage (edit) application.
    """
    from app.applications.infra.application_model import Application
    
    application = db.query(Application).filter(
        Application.uuid == application_uuid,
        Application.organization_id == ctx.organization.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if not canManageApplication(ctx, application.id):
        raise HTTPException(status_code=403, detail="Not allowed to manage this application")
    
    # Update logic here
    return application


@router.get("/billing")
def getBilling(
    organization_uuid: UUID,
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """
    Example: Check permission to view billing.
    """
    if not canViewBilling(ctx):
        raise HTTPException(status_code=403, detail="Not allowed to view billing")
    
    # Billing logic here
    return {"billing": "data"}


@router.get("/admin-only")
def adminOnlyEndpoint(
    organization_uuid: UUID,
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """
    Example: Endpoint only for organization admins.
    """
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Admin logic here
    return {"admin": "data"}
