"""HTTP handlers for token endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.shared.database.database import get_db
from app.users.infra.user_model import User, UserRole
from app.shared.dependencies.auth import require_role
from app.auth.infra.token_repository import TokenRepository
from app.auth.core.token_service import TokenService
from app.auth.api.token_dto import (
    TokenCreate,
    TokenResponse,
    TokenUpdate,
    TokenCreateResponse,
)
from app.auth.core.token_validators import TokenNotFoundError

router = APIRouter(prefix="/tokens", tags=["tokens"])


def get_token_repository(
    database_session: Session = Depends(get_db),
) -> TokenRepository:
    """Get token repository."""
    return TokenRepository(database_session)


def get_token_service(
    repository: TokenRepository = Depends(get_token_repository),
    database_session: Session = Depends(get_db),
) -> TokenService:
    """Get token service."""
    return TokenService(repository, database_session)


@router.get("", response_model=List[TokenResponse])
async def list_tokens(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = Query(None),
    service: TokenService = Depends(get_token_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """List all tokens (admin only)."""
    return service.list_tokens(skip=skip, limit=limit, search=search)


@router.get("/{token_uuid}", response_model=TokenResponse)
async def get_token(
    token_uuid: str,
    service: TokenService = Depends(get_token_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Get token by UUID (admin only)."""
    try:
        return service.get_token(token_uuid)
    except TokenNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "", response_model=TokenCreateResponse, status_code=status.HTTP_201_CREATED
)
async def create_token(
    token_data: TokenCreate,
    service: TokenService = Depends(get_token_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Create a new token (admin only)."""
    user_id = current_user.id if hasattr(current_user, "id") else None
    return service.create_token(token_data, user_id)


@router.put("/{token_uuid}", response_model=TokenResponse)
async def update_token(
    token_uuid: str,
    token_data: TokenUpdate,
    service: TokenService = Depends(get_token_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Update a token (admin only)."""
    try:
        return service.update_token(token_uuid, token_data)
    except TokenNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{token_uuid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_token(
    token_uuid: str,
    service: TokenService = Depends(get_token_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Delete a token (admin only)."""
    try:
        service.delete_token(token_uuid)
    except TokenNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
