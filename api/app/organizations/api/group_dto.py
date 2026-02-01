from pydantic import BaseModel, ConfigDict, model_validator
from uuid import UUID
from datetime import datetime
from typing import Any, List
from app.organizations.core.enums import ScopeLevel, GroupRole
from app.organizations.core.validators import validateGroupScopeAndRole
from app.organizations.api.group_member_dto import GroupMember


class GroupBase(BaseModel):
    name: str
    description: str | None = None
    scope_level: ScopeLevel
    role: GroupRole
    environment_id: UUID | None = None
    application_id: UUID | None = None
    is_default: bool = False


class GroupCreate(GroupBase):
    organization_id: UUID

    @model_validator(mode="after")
    def validate_scope_consistency(self):
        validateGroupScopeAndRole(self.scope_level, self.role)

        if self.scope_level == ScopeLevel.ORG:
            if self.environment_id is not None or self.application_id is not None:
                raise ValueError(
                    "For org scope, environment_id and application_id must be None"
                )
        elif self.scope_level == ScopeLevel.ENVIRONMENT:
            if self.environment_id is None:
                raise ValueError("For environment scope, environment_id is required")
            if self.application_id is not None:
                raise ValueError("For environment scope, application_id must be None")
        elif self.scope_level == ScopeLevel.APPLICATION:
            if self.application_id is None:
                raise ValueError("For application scope, application_id is required")

        return self


class GroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    scope_level: ScopeLevel | None = None
    role: GroupRole | None = None
    environment_id: UUID | None = None
    application_id: UUID | None = None
    is_default: bool | None = None

    @model_validator(mode="after")
    def validate_scope_consistency(self):
        # Only validate if scope_level or role are being updated
        if self.scope_level is not None and self.role is not None:
            validateGroupScopeAndRole(self.scope_level, self.role)
        return self


class Group(GroupBase):
    uuid: UUID
    organization_id: UUID
    created_at: str
    members: List[GroupMember] = []

    @model_validator(mode="before")
    @classmethod
    def convert_datetime_and_organization_id(cls, data: Any) -> Any:
        """Convert datetime to string, organization_id (int) to organization UUID, and include group members."""
        # Handle SQLAlchemy model instance
        if hasattr(data, "__class__") and hasattr(data, "uuid"):
            result = {
                "uuid": data.uuid,
                "name": data.name,
                "description": data.description,
                "scope_level": data.scope_level.value
                if hasattr(data.scope_level, "value")
                else data.scope_level,
                "role": data.role.value if hasattr(data.role, "value") else data.role,
                "is_default": data.is_default,
                "created_at": data.created_at.isoformat()
                if isinstance(data.created_at, datetime)
                else data.created_at,
            }
            # Convert organization_id from relationship if loaded
            if hasattr(data, "organization") and data.organization:
                result["organization_id"] = data.organization.uuid
            else:
                raise ValueError("Organization relationship must be loaded")
            # Convert environment_id from relationship if loaded
            if hasattr(data, "environment") and data.environment:
                result["environment_id"] = data.environment.uuid
            else:
                result["environment_id"] = None
            # Convert application_id from relationship if loaded
            if hasattr(data, "application") and data.application:
                result["application_id"] = data.application.uuid
            else:
                result["application_id"] = None
            # Include group members (owner and others) when loaded
            members_list: List[GroupMember] = []
            if hasattr(data, "members") and data.members:
                for m in data.members:
                    om = getattr(m, "organization_member", None)
                    org_member_uuid = om.uuid if om else None
                    if org_member_uuid is None:
                        continue
                    members_list.append(
                        GroupMember(
                            uuid=m.uuid,
                            group_id=data.uuid,
                            organization_member_id=org_member_uuid,
                            created_at=m.created_at.isoformat()
                            if isinstance(m.created_at, datetime)
                            else str(m.created_at),
                        )
                    )
            result["members"] = members_list
            return result
        # Handle dict
        elif isinstance(data, dict):
            if "created_at" in data and isinstance(data["created_at"], datetime):
                data["created_at"] = data["created_at"].isoformat()
            # Convert organization_id (int) to organization UUID if organization relationship is loaded
            if (
                "organization" in data
                and data["organization"]
                and hasattr(data["organization"], "uuid")
            ):
                data["organization_id"] = data["organization"].uuid
            # Convert environment_id (int) to environment UUID if environment relationship is loaded
            if (
                "environment" in data
                and data["environment"]
                and hasattr(data["environment"], "uuid")
            ):
                data["environment_id"] = data["environment"].uuid
            # Convert application_id (int) to application UUID if application relationship is loaded
            if (
                "application" in data
                and data["application"]
                and hasattr(data["application"], "uuid")
            ):
                data["application_id"] = data["application"].uuid
            # Ensure members is present when building from dict (e.g. from nested serialization)
            if "members" not in data:
                data["members"] = []
        return data

    model_config = ConfigDict(
        from_attributes=True,
    )
