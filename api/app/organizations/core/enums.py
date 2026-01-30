from enum import Enum


class ScopeLevel(str, Enum):
    ORG = "org"
    ENVIRONMENT = "environment"
    APPLICATION = "application"


class OrganizationMemberStatus(str, Enum):
    ACTIVE = "active"
    INVITED = "invited"
    DISABLED = "disabled"


class GroupRole(str, Enum):
    # Organization roles
    ORG_OWNER = "ORG_OWNER"
    ORG_ADMIN = "ORG_ADMIN"
    ORG_BILLING = "ORG_BILLING"
    ORG_MEMBER = "ORG_MEMBER"

    # Environment roles
    ENV_MAINTAINER = "ENV_MAINTAINER"
    ENV_OPERATOR = "ENV_OPERATOR"
    ENV_VIEWER = "ENV_VIEWER"

    # Application roles
    APP_MAINTAINER = "APP_MAINTAINER"
    APP_DEVELOPER = "APP_DEVELOPER"
    APP_VIEWER = "APP_VIEWER"
