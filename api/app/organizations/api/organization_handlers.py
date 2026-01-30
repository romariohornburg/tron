from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.shared.database.database import get_db
from app.organizations.infra.organization_repository import OrganizationRepository
from app.organizations.core.organization_service import OrganizationService
from app.organizations.api.organization_dto import (
    OrganizationCreate,
    OrganizationUpdate,
    Organization,
)
from app.organizations.core.organization_validators import (
    OrganizationNotFoundError,
    OrganizationNameAlreadyExistsError,
    UserNotFoundError,
    validate_user_exists,
)
from app.organizations.api.organization_member_dto import (
    OrganizationMemberCreate,
    OrganizationMemberUpdate,
    OrganizationMember,
)
from app.organizations.api.group_member_dto import GroupMemberCreate
from app.organizations.api.group_dto import Group
from app.organizations.core.group_member_service import (
    GroupMemberService,
    GroupMemberNotFoundError,
    GroupMemberAlreadyExistsError,
    OrganizationMemberNotFoundError as GroupMemberOrgMemberNotFoundError,
)
from app.organizations.core.group_validators import GroupNotFoundError
from app.users.infra.user_repository import UserRepository
from app.users.infra.user_model import User, UserRole
from app.shared.dependencies.auth import get_current_user, get_current_user_or_token, require_role, TokenUser
from app.organizations.api.dependencies.organization_context import getOrganizationContext
from app.organizations.core.authorization import OrganizationAccessContext, isOrgAdmin, isOrgOwner
from app.auth.infra.token_model import Token


router = APIRouter(prefix="/organizations", tags=["organizations"])


def get_organization_service(
    database_session: Session = Depends(get_db),
) -> OrganizationService:
    """Dependency to get OrganizationService instance."""
    organization_repository = OrganizationRepository(database_session)
    user_repository = UserRepository(database_session)
    return OrganizationService(
        organization_repository, user_repository, database_session
    )


@router.post("/", response_model=Organization)
def create_organization(
    organization: OrganizationCreate,
    service: OrganizationService = Depends(get_organization_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Create a new organization. Only admin users can create. Owner is the chosen user or the authenticated user."""
    try:
        owner_user_id = current_user.id
        if organization.owner_user_id is not None:
            validate_user_exists(
                service.user_repository,
                organization.owner_user_id,
            )
            owner_user = service.user_repository.find_by_uuid(organization.owner_user_id)
            if owner_user:
                owner_user_id = owner_user.id
        return service.create_organization(organization, owner_user_id=owner_user_id)
    except OrganizationNameAlreadyExistsError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{uuid}", response_model=Organization)
def update_organization(
    uuid: UUID,
    organization: OrganizationUpdate,
    service: OrganizationService = Depends(get_organization_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Update an existing organization. Only platform admin users can update organizations."""
    try:
        return service.update_organization(uuid, organization)
    except OrganizationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except OrganizationNameAlreadyExistsError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[Organization])
def list_organizations(
    skip: int = 0,
    limit: int = 100,
    service: OrganizationService = Depends(get_organization_service),
    current_user: User = Depends(get_current_user),
    current_auth=Depends(get_current_user_or_token),
):
    """List organizations. Admin users see all; other users see organizations where they are org admin (owner or ORG_ADMIN)."""
    # Handle TokenUser (tokens use the role of the associated user)
    if isinstance(current_user, TokenUser):
        # TokenUser has role from associated user, treat same as regular User
        if current_user.role == UserRole.ADMIN.value:
            return service.get_organizations(skip=skip, limit=limit, user_id=None)
        # Get user_id from token to find organizations where user is admin
        token = getattr(current_user, '_token', None)
        if token and isinstance(token, Token) and token.user_id:
            return service.get_organizations_where_user_is_admin(
                token.user_id, skip=skip, limit=limit
            )
        return []

    # Handle regular User: admin sees all; others see organizations where they are org admin (owner or ORG_ADMIN)
    if isinstance(current_user, User):
        if current_user.role == UserRole.ADMIN:
            return service.get_organizations(skip=skip, limit=limit, user_id=None)
        return service.get_organizations_where_user_is_admin(
            current_user.id, skip=skip, limit=limit
        )

    # Fallback: return empty list
    return []


@router.get("/{uuid}", response_model=Organization)
def get_organization(
    uuid: UUID,
    service: OrganizationService = Depends(get_organization_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Get organization by UUID. User must be a member of the organization."""
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can get organizations")

    try:
        return service.get_organization(uuid)
    except OrganizationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{uuid}", response_model=dict)
def delete_organization(
    uuid: UUID,
    service: OrganizationService = Depends(get_organization_service),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Delete an organization. Only platform admin users can delete organizations."""
    try:
        return service.delete_organization(uuid)
    except OrganizationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{uuid}/members", response_model=list[OrganizationMember])
def list_organization_members(
    uuid: UUID,
    service: OrganizationService = Depends(get_organization_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """List organization members. Only the organization owner can access."""
    if not isOrgOwner(ctx):
        raise HTTPException(status_code=403, detail="Only the organization owner can list members")

    try:
        org = service.get_organization(uuid)
        return list(org.members) if org.members else []
    except OrganizationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{uuid}/members", response_model=OrganizationMember)
def add_member_to_organization(
    uuid: UUID,
    member: OrganizationMemberCreate,
    service: OrganizationService = Depends(get_organization_service),
    db: Session = Depends(get_db),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Add a user as a member to an organization. Only organization admins can add members."""
    # Verify user has permission to add members
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can add members")

    # Ensure organization_uuid matches
    if member.organization_id != uuid:
        raise HTTPException(status_code=400, detail="Organization UUID mismatch")

    try:
        member_model = service.add_member_to_organization(uuid, member.user_id)
        # Reload with relationships for DTO serialization
        from app.organizations.infra.organization_member_repository import OrganizationMemberRepository
        member_repo = OrganizationMemberRepository(db)
        return member_repo.find_by_uuid(member_model.uuid)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{uuid}/members/{member_uuid}", response_model=OrganizationMember)
def update_organization_member(
    uuid: UUID,
    member_uuid: UUID,
    member_update: OrganizationMemberUpdate,
    service: OrganizationService = Depends(get_organization_service),
    db: Session = Depends(get_db),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Update an organization member. Only organization admins can update members."""
    # Verify user has permission to update members
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can update members")

    try:
        member_model = service.update_member(uuid, member_uuid, member_update)
        # Reload with relationships for DTO serialization
        from app.organizations.infra.organization_member_repository import OrganizationMemberRepository
        member_repo = OrganizationMemberRepository(db)
        return member_repo.find_by_uuid(member_model.uuid)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{uuid}/members/{member_uuid}", response_model=dict)
def remove_organization_member(
    uuid: UUID,
    member_uuid: UUID,
    service: OrganizationService = Depends(get_organization_service),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Remove a member from an organization. Only organization admins can remove members."""
    # Verify user has permission to remove members
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can remove members")

    try:
        return service.remove_member(uuid, member_uuid)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def get_group_member_service(
    database_session: Session = Depends(get_db),
) -> GroupMemberService:
    """Dependency to get GroupMemberService instance."""
    from app.organizations.infra.group_member_repository import GroupMemberRepository
    from app.organizations.infra.group_repository import GroupRepository
    from app.organizations.infra.organization_member_repository import OrganizationMemberRepository

    group_member_repository = GroupMemberRepository(database_session)
    group_repository = GroupRepository(database_session)
    organization_member_repository = OrganizationMemberRepository(database_session)
    return GroupMemberService(
        group_member_repository,
        group_repository,
        organization_member_repository,
        database_session,
    )


def _validate_member_belongs_to_org(
    member_uuid: UUID, organization_id: int, db: Session
):
    """Helper to validate member belongs to organization and return member."""
    from app.organizations.infra.organization_member_repository import OrganizationMemberRepository
    member_repo = OrganizationMemberRepository(db)
    member = member_repo.find_by_uuid(member_uuid)
    if not member:
        raise HTTPException(status_code=404, detail="Organization member not found")
    if member.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Organization member not found")
    return member


@router.post("/{uuid}/members/{member_uuid}/groups", response_model=dict)
def add_member_to_group(
    uuid: UUID,
    member_uuid: UUID,
    group_member: GroupMemberCreate,
    group_member_service: GroupMemberService = Depends(get_group_member_service),
    db: Session = Depends(get_db),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Add an organization member to a group. Only organization admins can add members to groups."""
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can add members to groups")

    _validate_member_belongs_to_org(member_uuid, ctx.organization.id, db)

    # Ensure member_uuid matches
    if group_member.organization_member_id != member_uuid:
        raise HTTPException(status_code=400, detail="Organization member UUID mismatch")

    try:
        group_member_service.add_member_to_group(group_member)
        return {"detail": "Member added to group successfully"}
    except GroupNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except GroupMemberOrgMemberNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except GroupMemberAlreadyExistsError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{uuid}/members/{member_uuid}/groups/{group_uuid}", response_model=dict)
def remove_member_from_group(
    uuid: UUID,
    member_uuid: UUID,
    group_uuid: UUID,
    group_member_service: GroupMemberService = Depends(get_group_member_service),
    db: Session = Depends(get_db),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Remove an organization member from a group. Only organization admins can remove members from groups."""
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can remove members from groups")

    member = _validate_member_belongs_to_org(member_uuid, ctx.organization.id, db)

    # Find group and group member
    from app.organizations.infra.group_repository import GroupRepository
    from app.organizations.infra.group_member_repository import GroupMemberRepository
    group_repo = GroupRepository(db)
    group = group_repo.find_by_uuid(group_uuid)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    group_member_repo = GroupMemberRepository(db)
    group_member = group_member_repo.find_by_group_and_organization_member(group.id, member.id)
    if not group_member:
        raise HTTPException(status_code=404, detail="Member is not in this group")

    try:
        group_member_service.remove_member_from_group(group_member.uuid)
        return {"detail": "Member removed from group successfully"}
    except GroupMemberNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{uuid}/members/{member_uuid}/groups", response_model=list[Group])
def get_member_groups(
    uuid: UUID,
    member_uuid: UUID,
    db: Session = Depends(get_db),
    ctx: OrganizationAccessContext = Depends(getOrganizationContext),
):
    """Get all groups for an organization member."""
    from app.organizations.api.group_dto import Group

    # Verify member belongs to organization
    from app.organizations.infra.organization_member_repository import OrganizationMemberRepository
    member_repo = OrganizationMemberRepository(db)
    member = member_repo.find_by_uuid(member_uuid)
    if not member:
        raise HTTPException(status_code=404, detail="Organization member not found")
    if member.organization_id != ctx.organization.id:
        raise HTTPException(status_code=404, detail="Organization member not found")

    # Get groups for this member
    from app.organizations.infra.group_member_repository import GroupMemberRepository
    from app.organizations.infra.group_repository import GroupRepository
    group_member_repo = GroupMemberRepository(db)
    group_repo = GroupRepository(db)
    group_members = group_member_repo.find_by_organization_member_id(member.id)

    groups = []
    for gm in group_members:
        if gm.group:
            # Reload group with relationships for DTO serialization
            group = group_repo.find_by_uuid(gm.group.uuid)
            if group:
                groups.append(group)

    return groups
