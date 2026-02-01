from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.shared.database.database import get_db
from app.shared.dependencies.auth import (
    get_current_user,
    get_current_user_or_token,
    TokenUser,
)
from app.organizations.core.authorization import (
    buildOrgAccessContext,
    buildOrgAccessContextForToken,
    OrganizationAccessContext,
)
from app.organizations.core.enums import OrganizationMemberStatus
from app.organizations.infra.organization_model import Organization
from app.users.infra.user_model import User
from app.auth.infra.token_model import Token


def getOrganizationContext(
    request: Request,
    db: Session = Depends(get_db),
    currentUser=Depends(get_current_user),
    currentAuth=Depends(get_current_user_or_token),
) -> OrganizationAccessContext:
    """
    FastAPI dependency to get organization access context for the current user or token.
    Reads organization UUID from path (organization_uuid or uuid) so it is not
    duplicated as a required parameter in OpenAPI/Swagger.
    """
    path_params = request.path_params
    org_uuid_str = path_params.get("organization_uuid") or path_params.get("uuid")
    if org_uuid_str is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization UUID is required",
        )
    try:
        org_uuid = UUID(org_uuid_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid organization UUID"
        )

    # Find organization by UUID and get its ID
    organization = db.query(Organization).filter(Organization.uuid == org_uuid).first()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    organization_id = organization.id

    # Handle Token authentication
    # Check if currentAuth is a Token (from x-tron-token header)
    if isinstance(currentAuth, Token):
        try:
            ctx = buildOrgAccessContextForToken(db, organization_id, currentAuth)
            return ctx
        except ValueError as e:
            msg = str(e)
            if "Organization not found" in msg:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Organization not found",
                )
            if "does not have permission" in msg:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Token does not have permission to access this organization",
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error building access context: {msg}",
            )

    # Handle TokenUser (when token was converted to TokenUser)
    if isinstance(currentUser, TokenUser):
        # Get the original token from TokenUser
        token = getattr(currentUser, "_token", None)
        if token and isinstance(token, Token):
            try:
                ctx = buildOrgAccessContextForToken(db, organization_id, token)
                return ctx
            except ValueError as e:
                msg = str(e)
                if "Organization not found" in msg:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Organization not found",
                    )
                if "does not have permission" in msg:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Token does not have permission to access this organization",
                    )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error building access context: {msg}",
                )
        else:
            # TokenUser without Token reference - fallback to checking currentAuth
            if isinstance(currentAuth, Token):
                try:
                    ctx = buildOrgAccessContextForToken(
                        db, organization_id, currentAuth
                    )
                    return ctx
                except ValueError as e:
                    msg = str(e)
                    if "Organization not found" in msg:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Organization not found",
                        )
                    if "does not have permission" in msg:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Token does not have permission to access this organization",
                        )
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Error building access context: {msg}",
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Token authentication not properly configured",
                )

    # Handle User authentication
    if isinstance(currentUser, User):
        user_id = currentUser.id
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user authentication",
        )

    try:
        ctx = buildOrgAccessContext(db, organization_id, user_id)
    except ValueError as e:
        msg = str(e)
        if "Organization not found" in msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
            )
        if "User is not a member" in msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this organization",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error building access context: {msg}",
        )

    if ctx.member.status != OrganizationMemberStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Membership not active"
        )

    return ctx
