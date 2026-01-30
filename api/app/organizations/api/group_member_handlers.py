from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.shared.database.database import get_db
from app.organizations.infra.group_member_repository import GroupMemberRepository
from app.organizations.infra.group_repository import GroupRepository
from app.organizations.infra.organization_member_repository import OrganizationMemberRepository
from app.organizations.core.group_member_service import (
    GroupMemberService,
    GroupMemberNotFoundError,
    GroupMemberAlreadyExistsError,
    OrganizationMemberNotFoundError,
)
from app.organizations.api.group_member_dto import (
    GroupMemberCreate,
    GroupMember,
)
from app.organizations.core.group_validators import GroupNotFoundError
from app.organizations.api.dependencies.organization_context import getOrganizationContext
from app.organizations.core.authorization import isOrgAdmin


router = APIRouter(prefix="/organizations/{organization_uuid}/groups/{group_uuid}/members", tags=["group-members"])


def get_group_member_service(
    database_session: Session = Depends(get_db),
) -> GroupMemberService:
    """Dependency to get GroupMemberService instance."""
    group_member_repository = GroupMemberRepository(database_session)
    group_repository = GroupRepository(database_session)
    organization_member_repository = OrganizationMemberRepository(database_session)
    return GroupMemberService(
        group_member_repository,
        group_repository,
        organization_member_repository,
        database_session,
    )


@router.post("/", response_model=GroupMember)
def add_member_to_group(
    organization_uuid: UUID,
    group_uuid: UUID,
    member: GroupMemberCreate,
    service: GroupMemberService = Depends(get_group_member_service),
    ctx = Depends(getOrganizationContext),
):
    """Add an organization member to a group. Only organization admins can add members."""
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can add members to groups")
    
    # Ensure group_uuid matches
    if member.group_id != group_uuid:
        raise HTTPException(status_code=400, detail="Group UUID mismatch")
    
    try:
        return service.add_member_to_group(member)
    except GroupNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except OrganizationMemberNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except GroupMemberAlreadyExistsError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{uuid}", response_model=dict)
def remove_member_from_group(
    organization_uuid: UUID,
    group_uuid: UUID,
    uuid: UUID,
    service: GroupMemberService = Depends(get_group_member_service),
    ctx = Depends(getOrganizationContext),
):
    """Remove an organization member from a group. Only organization admins can remove members."""
    if not isOrgAdmin(ctx):
        raise HTTPException(status_code=403, detail="Only organization admins can remove members from groups")
    
    try:
        return service.remove_member_from_group(uuid)
    except GroupMemberNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[GroupMember])
def list_group_members(
    organization_uuid: UUID,
    group_uuid: UUID,
    service: GroupMemberService = Depends(get_group_member_service),
    ctx = Depends(getOrganizationContext),
):
    """List all members of a group."""
    try:
        return service.get_group_members(group_uuid)
    except GroupNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
