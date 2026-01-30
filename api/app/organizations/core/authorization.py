from dataclasses import dataclass
from uuid import UUID
from typing import List, Set
from sqlalchemy.orm import Session

from app.organizations.core.enums import ScopeLevel, GroupRole, OrganizationMemberStatus
from app.organizations.infra.organization_model import Organization
from app.organizations.infra.organization_member_model import OrganizationMember
from app.organizations.infra.group_model import Group
from app.organizations.infra.group_member_model import GroupMember
from app.auth.infra.token_model import Token
from app.environments.infra.environment_model import Environment
from app.applications.infra.application_model import Application
from app.instances.infra.instance_model import Instance


@dataclass
class OrganizationAccessContext:
    user_id: int
    organization: Organization
    member: OrganizationMember
    groups: List[Group]
    roles: Set[GroupRole]


def buildOrgAccessContext(db: Session, organization_id: int, user_id: int) -> OrganizationAccessContext:
    """Build organization access context for a user."""
    organization = db.query(Organization).filter(Organization.id == organization_id).one_or_none()
    if organization is None:
        raise ValueError("Organization not found")

    member = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id
        )
        .one_or_none()
    )
    if member is None:
        raise ValueError("User is not a member of this organization")

    groups = (
        db.query(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .filter(GroupMember.organization_member_id == member.id)
        .all()
    )

    roles = {g.role for g in groups}

    if member.is_owner:
        roles.add(GroupRole.ORG_OWNER)

    return OrganizationAccessContext(
        user_id=user_id,
        organization=organization,
        member=member,
        groups=groups,
        roles=roles,
    )


def buildOrgAccessContextForToken(
    db: Session, organization_id: int, token: Token
) -> OrganizationAccessContext:
    """
    Build organization access context for a token.

    Tokens with a user_id use that user's permissions.
    Tokens without user_id are denied access.
    """
    organization = db.query(Organization).filter(Organization.id == organization_id).one_or_none()
    if organization is None:
        raise ValueError("Organization not found")

    if token.user_id:
        return buildOrgAccessContext(db, organization_id, token.user_id)

    raise ValueError("Token does not have permission to access this organization")


# Basic permission helpers
def isOrgOwner(ctx: OrganizationAccessContext) -> bool:
    """Check if user is organization owner."""
    return GroupRole.ORG_OWNER in ctx.roles or ctx.member.is_owner


def isOrgAdmin(ctx: OrganizationAccessContext) -> bool:
    """Check if user is organization admin."""
    return GroupRole.ORG_ADMIN in ctx.roles or isOrgOwner(ctx)


def isOrgMember(ctx: OrganizationAccessContext) -> bool:
    """Check if user is a regular organization member (has ORG_MEMBER role)."""
    return GroupRole.ORG_MEMBER in ctx.roles or isOrgAdmin(ctx)


def canViewBilling(ctx: OrganizationAccessContext) -> bool:
    """Check if user can view billing information."""
    return (GroupRole.ORG_BILLING in ctx.roles) or isOrgAdmin(ctx)


# Helpers para environment
def hasEnvRole(ctx: OrganizationAccessContext, environment_id: int, allowedRoles: set[GroupRole]) -> bool:
    """Check if user has any of the allowed roles for a specific environment."""
    if isOrgAdmin(ctx):
        return True

    for g in ctx.groups:
        if (
            g.scope_level == ScopeLevel.ENVIRONMENT
            and g.environment_id == environment_id
            and g.role in allowedRoles
        ):
            return True

    return False


def isEnvMaintainer(ctx: OrganizationAccessContext, environment_id: int) -> bool:
    """Env maintainer for a specific environment."""
    return hasEnvRole(ctx, environment_id, {GroupRole.ENV_MAINTAINER})


def isEnvOperator(ctx: OrganizationAccessContext, environment_id: int) -> bool:
    """Env operator for a specific environment."""
    return hasEnvRole(ctx, environment_id, {GroupRole.ENV_OPERATOR, GroupRole.ENV_MAINTAINER})


def canViewEnvironment(ctx: OrganizationAccessContext, environment_id: int) -> bool:
    """Check if user can view environment."""
    return hasEnvRole(
        ctx,
        environment_id,
        {GroupRole.ENV_VIEWER, GroupRole.ENV_OPERATOR, GroupRole.ENV_MAINTAINER}
    )


def canDeployToEnvironment(ctx: OrganizationAccessContext, environment_id: int) -> bool:
    """Check if user can deploy to environment."""
    return hasEnvRole(
        ctx,
        environment_id,
        {GroupRole.ENV_OPERATOR, GroupRole.ENV_MAINTAINER}
    )


def canManageEnvironment(ctx: OrganizationAccessContext, environment_id: int) -> bool:
    """Check if user can manage environment configuration."""
    return hasEnvRole(
        ctx,
        environment_id,
        {GroupRole.ENV_MAINTAINER}
    )


# Helpers para application (ORG scope / APP scope)
def hasAppRole(ctx: OrganizationAccessContext, application_id: int, allowedRoles: set[GroupRole]) -> bool:
    """Check if user has any of the allowed roles for a specific application.

    Current rule:
    - ORG_ADMIN / ORG_OWNER -> full access
    - ORG_MEMBER -> full access to all applications in the organization
    - Otherwise, falls back to application scope group logic.
    """
    if isOrgAdmin(ctx):
        return True

    if GroupRole.ORG_MEMBER in ctx.roles:
        return True

    for g in ctx.groups:
        if (
            g.scope_level == ScopeLevel.APPLICATION
            and g.application_id == application_id
            and g.role in allowedRoles
        ):
            return True

    return False


def isAppDeveloper(ctx: OrganizationAccessContext, application_id: int) -> bool:
    """App developer for a specific application."""
    return hasAppRole(ctx, application_id, {GroupRole.APP_DEVELOPER})


def isAppMaintainer(ctx: OrganizationAccessContext, application_id: int) -> bool:
    """App maintainer for a specific application."""
    return hasAppRole(ctx, application_id, {GroupRole.APP_MAINTAINER})


def canViewApplication(ctx: OrganizationAccessContext, application_id: int) -> bool:
    """Check if user can view application."""
    return hasAppRole(
        ctx,
        application_id,
        {GroupRole.APP_VIEWER, GroupRole.APP_DEVELOPER, GroupRole.APP_MAINTAINER}
    )


def canDeployApplication(ctx: OrganizationAccessContext, application_id: int) -> bool:
    """Check if user can deploy application."""
    return hasAppRole(
        ctx,
        application_id,
        {GroupRole.APP_DEVELOPER, GroupRole.APP_MAINTAINER}
    )


def canManageApplication(ctx: OrganizationAccessContext, application_id: int) -> bool:
    """Check if user can manage application configuration."""
    return hasAppRole(
        ctx,
        application_id,
        {GroupRole.APP_MAINTAINER}
    )





# ✅ NEW: Helpers para Instance (ENV scope + ORG scope)
def _getInstanceOrNone(db: Session, ctx: OrganizationAccessContext, instance_id: int) -> Instance | None:
    """
    Load instance ensuring it belongs to the same organization.
    We enforce org isolation by joining through Application (which has organization_id).
    """
    return (
        db.query(Instance)
        .join(Application, Application.id == Instance.application_id)
        .filter(
            Instance.id == instance_id,
            Application.organization_id == ctx.organization.id,
        )
        .one_or_none()
    )


def canCreateInstance(ctx: OrganizationAccessContext, environment_id: int) -> bool:
    """
    Create an instance in a specific environment.

    Allowed:
    - ORG_ADMIN/OWNER (via isOrgAdmin)
    - ORG_MEMBER (dev global)
    - ENV_MAINTAINER for that env
    """
    if isOrgAdmin(ctx):
        return True
    if GroupRole.ORG_MEMBER in ctx.roles:
        return True
    return hasEnvRole(ctx, environment_id, {GroupRole.ENV_MAINTAINER})


def canViewInstance(ctx: OrganizationAccessContext, instance_id: int, db: Session) -> bool:
    """
    View instance details (and usually logs/metrics read-only).

    Allowed:
    - ORG_ADMIN/OWNER
    - ORG_MEMBER (dev global)
    - ENV_VIEWER/OPERATOR/MAINTAINER for the instance environment
    """
    if isOrgAdmin(ctx):
        return True
    if GroupRole.ORG_MEMBER in ctx.roles:
        return True

    inst = _getInstanceOrNone(db, ctx, instance_id)
    if not inst:
        return False

    return hasEnvRole(
        ctx,
        inst.environment_id,
        {GroupRole.ENV_VIEWER, GroupRole.ENV_OPERATOR, GroupRole.ENV_MAINTAINER}
    )


def canOperateInstance(ctx: OrganizationAccessContext, instance_id: int, db: Session) -> bool:
    """
    Operate an instance (deploy/restart/rollback/change image+version, etc.)

    Allowed:
    - ORG_ADMIN/OWNER
    - ORG_MEMBER (dev global)
    - ENV_OPERATOR/MAINTAINER for the instance environment
    """
    if isOrgAdmin(ctx):
        return True
    if GroupRole.ORG_MEMBER in ctx.roles:
        return True

    inst = _getInstanceOrNone(db, ctx, instance_id)
    if not inst:
        return False

    return hasEnvRole(
        ctx,
        inst.environment_id,
        {GroupRole.ENV_OPERATOR, GroupRole.ENV_MAINTAINER}
    )


def canManageInstance(ctx: OrganizationAccessContext, instance_id: int, db: Session) -> bool:
    """
    Manage instance (create/delete semantics + more sensitive config actions).

    Allowed:
    - ORG_ADMIN/OWNER
    - ORG_MEMBER (dev global)
    - ENV_MAINTAINER for the instance environment
    """
    if isOrgAdmin(ctx):
        return True
    if GroupRole.ORG_MEMBER in ctx.roles:
        return True

    inst = _getInstanceOrNone(db, ctx, instance_id)
    if not inst:
        return False

    return hasEnvRole(ctx, inst.environment_id, {GroupRole.ENV_MAINTAINER})


def canDeleteInstance(ctx: OrganizationAccessContext, instance_id: int, db: Session) -> bool:
    """
    Delete instance.

    Allowed:
    - ORG_ADMIN/OWNER
    - ORG_MEMBER (dev global)
    - ENV_MAINTAINER for the instance environment
    """
    return canManageInstance(ctx, instance_id, db)


# Helper functions that accept UUIDs (convenience wrappers)
def canViewEnvironmentByUuid(ctx: OrganizationAccessContext, environment_uuid: UUID, db: Session) -> bool:
    """Check if user can view environment by UUID."""
    environment = db.query(Environment).filter(
        Environment.uuid == environment_uuid,
        Environment.organization_id == ctx.organization.id
    ).first()
    if not environment:
        return False
    return canViewEnvironment(ctx, environment.id)


def canDeployToEnvironmentByUuid(ctx: OrganizationAccessContext, environment_uuid: UUID, db: Session) -> bool:
    """Check if user can deploy to environment by UUID."""
    environment = db.query(Environment).filter(
        Environment.uuid == environment_uuid,
        Environment.organization_id == ctx.organization.id
    ).first()
    if not environment:
        return False
    return canDeployToEnvironment(ctx, environment.id)


def canManageEnvironmentByUuid(ctx: OrganizationAccessContext, environment_uuid: UUID, db: Session) -> bool:
    """Check if user can manage environment by UUID."""
    environment = db.query(Environment).filter(
        Environment.uuid == environment_uuid,
        Environment.organization_id == ctx.organization.id
    ).first()
    if not environment:
        return False
    return canManageEnvironment(ctx, environment.id)


def canViewApplicationByUuid(ctx: OrganizationAccessContext, application_uuid: UUID, db: Session) -> bool:
    """Check if user can view application by UUID."""
    application = db.query(Application).filter(
        Application.uuid == application_uuid,
        Application.organization_id == ctx.organization.id
    ).first()
    if not application:
        return False
    return canViewApplication(ctx, application.id)


def canDeployApplicationByUuid(ctx: OrganizationAccessContext, application_uuid: UUID, db: Session) -> bool:
    """Check if user can deploy application by UUID."""
    application = db.query(Application).filter(
        Application.uuid == application_uuid,
        Application.organization_id == ctx.organization.id
    ).first()
    if not application:
        return False
    return canDeployApplication(ctx, application.id)


def canManageApplicationByUuid(ctx: OrganizationAccessContext, application_uuid: UUID, db: Session) -> bool:
    """Check if user can manage application by UUID."""
    application = db.query(Application).filter(
        Application.uuid == application_uuid,
        Application.organization_id == ctx.organization.id
    ).first()
    if not application:
        return False
    return canManageApplication(ctx, application.id)


# ✅ NEW: UUID wrappers for Instance
def canViewInstanceByUuid(ctx: OrganizationAccessContext, instance_uuid: UUID, db: Session) -> bool:
    inst = (
        db.query(Instance)
        .join(Application, Application.id == Instance.application_id)
        .filter(
            Instance.uuid == instance_uuid,
            Application.organization_id == ctx.organization.id,
        )
        .one_or_none()
    )
    if not inst:
        return False
    return canViewInstance(ctx, inst.id, db)


def canOperateInstanceByUuid(ctx: OrganizationAccessContext, instance_uuid: UUID, db: Session) -> bool:
    inst = (
        db.query(Instance)
        .join(Application, Application.id == Instance.application_id)
        .filter(
            Instance.uuid == instance_uuid,
            Application.organization_id == ctx.organization.id,
        )
        .one_or_none()
    )
    if not inst:
        return False
    return canOperateInstance(ctx, inst.id, db)


def canManageInstanceByUuid(ctx: OrganizationAccessContext, instance_uuid: UUID, db: Session) -> bool:
    inst = (
        db.query(Instance)
        .join(Application, Application.id == Instance.application_id)
        .filter(
            Instance.uuid == instance_uuid,
            Application.organization_id == ctx.organization.id,
        )
        .one_or_none()
    )
    if not inst:
        return False
    return canManageInstance(ctx, inst.id, db)


def canDeleteInstanceByUuid(ctx: OrganizationAccessContext, instance_uuid: UUID, db: Session) -> bool:
    return canManageInstanceByUuid(ctx, instance_uuid, db)
