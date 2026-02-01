from pydantic import BaseModel, ConfigDict, model_validator
from uuid import UUID
from datetime import datetime
from typing import Any
from app.organizations.core.enums import OrganizationMemberStatus


class OrganizationMemberBase(BaseModel):
    organization_id: UUID
    user_id: UUID
    is_owner: bool = False
    status: OrganizationMemberStatus = OrganizationMemberStatus.ACTIVE


class OrganizationMemberCreate(BaseModel):
    organization_id: UUID
    user_id: UUID
    is_owner: bool = False
    status: OrganizationMemberStatus | None = (
        None  # Optional, defaults to ACTIVE in service
    )


class OrganizationMemberUpdate(BaseModel):
    is_owner: bool | None = None
    status: OrganizationMemberStatus | None = None


class OrganizationMember(OrganizationMemberBase):
    uuid: UUID
    created_at: str
    email: str | None = None
    full_name: str | None = None

    @model_validator(mode="before")
    @classmethod
    def convert_datetime_to_string(cls, data: Any) -> Any:
        """Convert datetime to string, user_id (int) to user UUID, and include user email and full_name when available."""
        # Handle SQLAlchemy model instance
        if hasattr(data, "__class__") and hasattr(data, "user"):
            # Convert to dict with user UUID, email, and full_name
            result = {
                "uuid": data.uuid,
                "organization_id": data.organization.uuid
                if hasattr(data, "organization") and data.organization
                else None,
                "user_id": data.user.uuid if data.user else None,
                "is_owner": data.is_owner,
                "status": data.status,
                "created_at": data.created_at.isoformat()
                if isinstance(data.created_at, datetime)
                else data.created_at,
                "email": getattr(data.user, "email", None) if data.user else None,
                "full_name": getattr(data.user, "full_name", None)
                if data.user
                else None,
            }
            return result
        # Handle dict
        elif isinstance(data, dict):
            if "created_at" in data and isinstance(data["created_at"], datetime):
                data["created_at"] = data["created_at"].isoformat()
            # Convert user_id (int) to user UUID if user relationship is loaded
            if "user" in data and data["user"] and hasattr(data["user"], "uuid"):
                data["user_id"] = data["user"].uuid
            # Include email and full_name from user when available
            if "user" in data and data["user"]:
                u = data["user"]
                if hasattr(u, "email"):
                    data["email"] = u.email
                if hasattr(u, "full_name"):
                    data["full_name"] = u.full_name
            # Convert organization_id (int) to organization UUID if organization relationship is loaded
            if (
                "organization" in data
                and data["organization"]
                and hasattr(data["organization"], "uuid")
            ):
                data["organization_id"] = data["organization"].uuid
        elif hasattr(data, "__dict__"):
            if hasattr(data, "created_at") and isinstance(data.created_at, datetime):
                data.created_at = data.created_at.isoformat()
        return data

    model_config = ConfigDict(
        from_attributes=True,
    )
