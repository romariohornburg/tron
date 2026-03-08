from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.shared.database.database import get_db
from app.users.infra.user_repository import UserRepository
from app.users.core.user_service import UserService
from app.users.api.user_dto import UserCreate, UserUpdate, UserResponse
from app.users.core.user_validators import (
    UserNotFoundError,
    UserEmailAlreadyExistsError,
    CannotDeleteSelfError,
    UserIsOrganizationOwnerError,
)
from app.users.infra.user_model import UserRole
from app.users.infra.user_model import User
from app.shared.dependencies.auth import require_role, get_current_user
from app.auth.core.auth_service import AuthService
from app.auth.infra.token_repository import TokenRepository
from app.auth.infra.user_social_account_repository import UserSocialAccountRepository
from app.organizations.infra.organization_repository import OrganizationRepository
from app.organizations.infra.organization_member_repository import (
    OrganizationMemberRepository,
)
from app.auth.core.token_service import TokenService
from app.auth.api.token_dto import (
    TokenCreate,
    TokenResponse,
    TokenUpdate,
    TokenCreateResponse,
)
from app.auth.core.token_validators import TokenNotFoundError


router = APIRouter(prefix="/users", tags=["users"])


def get_user_service(database_session: Session = Depends(get_db)) -> UserService:
    """Dependency to get UserService instance."""
    user_repository = UserRepository(database_session)
    auth_service = AuthService()
    social_account_repository = UserSocialAccountRepository(database_session)
    organization_repository = OrganizationRepository(database_session)
    organization_member_repository = OrganizationMemberRepository(database_session)
    return UserService(
        user_repository,
        auth_service,
        social_account_repository,
        organization_repository,
        organization_member_repository,
    )


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


@router.get("", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = Query(None),
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """List all users (admin only)."""
    return service.get_users(skip=skip, limit=limit, search=search)


@router.get("/{user_uuid}", response_model=UserResponse)
async def get_user(
    user_uuid: UUID,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Get user by UUID (admin only)."""
    try:
        return service.get_user(user_uuid)
    except UserNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Create a new user (admin only)."""
    try:
        return service.create_user(user_data)
    except UserEmailAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{user_uuid}", response_model=UserResponse)
async def update_user(
    user_uuid: UUID,
    user_data: UserUpdate,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Update a user (admin only)."""
    try:
        return service.update_user(user_uuid, user_data)
    except UserNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UserEmailAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{user_uuid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_uuid: UUID,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Delete a user (admin only)."""
    try:
        service.delete_user(user_uuid, current_user.uuid)
    except UserNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except CannotDeleteSelfError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except UserIsOrganizationOwnerError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# Token endpoints under /users/{user_uuid}/tokens
@router.get("/{user_uuid}/tokens", response_model=List[TokenResponse])
async def list_user_tokens(
    user_uuid: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = Query(None),
    token_service: TokenService = Depends(get_token_service),
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user),
):
    """List all tokens for a user. Users can only list their own tokens."""
    # Users can only access their own tokens (unless admin)
    if current_user.uuid != user_uuid and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own tokens",
        )

    # Verify user exists
    try:
        user_service.get_user(user_uuid)
    except UserNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    # Get user to filter tokens
    user_repository = UserRepository(token_service.db)
    user = user_repository.find_by_uuid(user_uuid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # List tokens filtered by user
    tokens = token_service.list_tokens(skip=skip, limit=limit, search=search)
    filtered_tokens = [t for t in tokens if t.user_id == user.id]
    return filtered_tokens


@router.get("/{user_uuid}/tokens/{token_uuid}", response_model=TokenResponse)
async def get_user_token(
    user_uuid: UUID,
    token_uuid: str,
    token_service: TokenService = Depends(get_token_service),
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user),
):
    """Get a token by UUID for a user. Users can only get their own tokens."""
    # Users can only access their own tokens (unless admin)
    if current_user.uuid != user_uuid and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own tokens",
        )

    # Verify user exists
    try:
        user_service.get_user(user_uuid)
    except UserNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    try:
        token = token_service.get_token(token_uuid)
        # Verify token belongs to user
        user_repository = UserRepository(token_service.db)
        user = user_repository.find_by_uuid(user_uuid)
        if not user or token.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Token not found"
            )
        return token
    except TokenNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/{user_uuid}/tokens",
    response_model=TokenCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_token(
    user_uuid: UUID,
    token_data: TokenCreate,
    token_service: TokenService = Depends(get_token_service),
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new token for a user. Uses current_user's UUID from authentication (user_uuid in path is kept for API consistency but ignored)."""
    # Use current_user's UUID instead of the path parameter
    # This allows users to create tokens for themselves without needing to specify user_uuid in the request body
    target_user_uuid = current_user.uuid

    # Verify user exists and get user_id
    try:
        user_service.get_user(target_user_uuid)
    except UserNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    user_repository = UserRepository(token_service.db)
    user = user_repository.find_by_uuid(target_user_uuid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return token_service.create_token(token_data, user.id)


@router.put("/{user_uuid}/tokens/{token_uuid}", response_model=TokenResponse)
async def update_user_token(
    user_uuid: UUID,
    token_uuid: str,
    token_data: TokenUpdate,
    token_service: TokenService = Depends(get_token_service),
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user),
):
    """Update a token for a user. Users can only update their own tokens."""
    # Users can only access their own tokens (unless admin)
    if current_user.uuid != user_uuid and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own tokens",
        )

    # Verify user exists
    try:
        user_service.get_user(user_uuid)
    except UserNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    try:
        token = token_service.get_token(token_uuid)
        # Verify token belongs to user
        user_repository = UserRepository(token_service.db)
        user = user_repository.find_by_uuid(user_uuid)
        if not user or token.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Token not found"
            )

        return token_service.update_token(token_uuid, token_data)
    except TokenNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete(
    "/{user_uuid}/tokens/{token_uuid}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_user_token(
    user_uuid: UUID,
    token_uuid: str,
    token_service: TokenService = Depends(get_token_service),
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user),
):
    """Delete a token for a user. Users can only delete their own tokens."""
    # Users can only access their own tokens (unless admin)
    if current_user.uuid != user_uuid and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own tokens",
        )

    # Verify user exists
    try:
        user_service.get_user(user_uuid)
    except UserNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    try:
        token = token_service.get_token(token_uuid)
        # Verify token belongs to user
        user_repository = UserRepository(token_service.db)
        user = user_repository.find_by_uuid(user_uuid)
        if not user or token.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Token not found"
            )

        token_service.delete_token(token_uuid)
    except TokenNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
