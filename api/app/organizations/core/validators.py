from app.organizations.core.enums import ScopeLevel, GroupRole


ORG_ROLES = {
    GroupRole.ORG_ADMIN,
    GroupRole.ORG_BILLING,
    GroupRole.ORG_MEMBER,
}

ENV_ROLES = {
    GroupRole.ENV_MAINTAINER,
    GroupRole.ENV_OPERATOR,
    GroupRole.ENV_VIEWER,
}

APP_ROLES = {
    GroupRole.APP_MAINTAINER,
    GroupRole.APP_DEVELOPER,
    GroupRole.APP_VIEWER,
}


def validateGroupScopeAndRole(scopeLevel: ScopeLevel, role: GroupRole) -> None:
    """Validate that the role is appropriate for the given scope level."""
    if scopeLevel == ScopeLevel.ORG and role not in ORG_ROLES:
        raise ValueError(f"Invalid role {role.value} for org scope. Must be one of: ORG_ADMIN, ORG_BILLING, ORG_MEMBER")
    if scopeLevel == ScopeLevel.ENVIRONMENT and role not in ENV_ROLES:
        raise ValueError(f"Invalid role {role.value} for environment scope. Must be one of: ENV_MAINTAINER, ENV_OPERATOR, ENV_VIEWER")
    if scopeLevel == ScopeLevel.APPLICATION and role not in APP_ROLES:
        raise ValueError(f"Invalid role {role.value} for application scope. Must be one of: APP_MAINTAINER, APP_DEVELOPER, APP_VIEWER")
