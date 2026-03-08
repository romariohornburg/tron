from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.shared.database.database import get_db
from app.auth.infra.identity_provider_repository import IdentityProviderRepository
from app.auth.core.identity_provider_service import (
    IdentityProviderService,
    IdentityProviderSlugAlreadyExistsError,
    IdentityProviderNotFoundError,
)
from app.auth.api.identity_provider_dto import (
    IdentityProviderCreate,
    IdentityProviderUpdate,
    IdentityProviderResponse,
    IdentityProviderPublic,
)
from app.users.infra.user_model import User, UserRole
from app.shared.dependencies.auth import require_role


router = APIRouter(tags=["identity-providers"])


def get_identity_provider_service(
    database_session: Session = Depends(get_db),
) -> IdentityProviderService:
    repo = IdentityProviderRepository(database_session)
    return IdentityProviderService(repo)


@router.get(
    "/identity-providers",
    response_model=List[IdentityProviderPublic],
    summary="List enabled identity providers (for login page)",
)
async def list_enabled_providers(
    enabled_only: bool = Query(True, description="Return only enabled providers"),
    service: IdentityProviderService = Depends(get_identity_provider_service),
):
    """Public endpoint: list identity providers available for login (e.g. Google, Microsoft)."""
    return service.list_public_enabled()


@router.get(
    "/admin/identity-providers",
    response_model=List[IdentityProviderResponse],
    summary="List all identity providers (admin)",
)
async def admin_list_providers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    enabled_only: Optional[bool] = Query(None),
    service: IdentityProviderService = Depends(get_identity_provider_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Admin only: list all identity providers with masked secrets."""
    return service.list(
        skip=skip,
        limit=limit,
        enabled_only=enabled_only or False,
    )


@router.post(
    "/admin/identity-providers",
    response_model=IdentityProviderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create identity provider (admin)",
)
async def admin_create_provider(
    data: IdentityProviderCreate,
    service: IdentityProviderService = Depends(get_identity_provider_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Admin only: create a new identity provider."""
    try:
        return service.create(data)
    except IdentityProviderSlugAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.options(
    "/admin/identity-providers/{provider_uuid}",
    include_in_schema=False,
)
async def admin_options_provider(provider_uuid: UUID):
    """CORS preflight: return 200 without auth so browser can send PATCH."""
    return Response(status_code=200)


@router.get(
    "/admin/identity-providers/{provider_uuid}",
    response_model=IdentityProviderResponse,
    summary="Get identity provider by UUID (admin)",
)
async def admin_get_provider(
    provider_uuid: UUID,
    service: IdentityProviderService = Depends(get_identity_provider_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Admin only: get one identity provider."""
    try:
        return service.get_by_uuid(provider_uuid)
    except IdentityProviderNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identity provider not found",
        )


@router.patch(
    "/admin/identity-providers/{provider_uuid}",
    response_model=IdentityProviderResponse,
    summary="Update identity provider (admin)",
)
async def admin_update_provider(
    provider_uuid: UUID,
    data: IdentityProviderUpdate,
    service: IdentityProviderService = Depends(get_identity_provider_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Admin only: update identity provider. Send client_secret only to change it."""
    try:
        return service.update(provider_uuid, data)
    except IdentityProviderNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identity provider not found",
        )


@router.delete(
    "/admin/identity-providers/{provider_uuid}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete identity provider (admin)",
)
async def admin_delete_provider(
    provider_uuid: UUID,
    service: IdentityProviderService = Depends(get_identity_provider_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Admin only: delete identity provider."""
    try:
        service.delete(provider_uuid)
    except IdentityProviderNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identity provider not found",
        )
