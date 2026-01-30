from pydantic import BaseModel, ConfigDict, model_validator
from uuid import UUID
from datetime import datetime
from typing import Any, List
from app.organizations.api.organization_member_dto import OrganizationMember
from app.environments.api.environment_dto import Environment
from app.organizations.api.group_dto import Group


class OrganizationBase(BaseModel):
    name: str


class OrganizationCreate(OrganizationBase):
    """Create organization. Optional owner_user_id; if omitted, the authenticated user becomes the owner."""
    owner_user_id: UUID | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = None
    owner_user_id: UUID | None = None


class Organization(OrganizationBase):
    uuid: UUID
    owner_user_id: UUID
    owner_email: str | None = None
    created_at: str
    members: List[OrganizationMember] = []
    environments: List[Environment] = []
    groups: List[Group] = []

    @model_validator(mode="before")
    @classmethod
    def convert_datetime_and_owner(cls, data: Any) -> Any:
        """Convert datetime to string and owner_user_id (int) to owner UUID. Include members if loaded."""
        # Handle SQLAlchemy model instance
        if hasattr(data, "__class__") and hasattr(data, "owner"):
            # Convert to dict with owner UUID
            result = {
                "uuid": data.uuid,
                "name": data.name,
                "created_at": data.created_at.isoformat() if isinstance(data.created_at, datetime) else data.created_at,
                "owner_user_id": data.owner.uuid if data.owner else None,
                "owner_email": getattr(data.owner, "email", None) if data.owner else None,
            }
            # Include members if loaded - Pydantic will serialize them using OrganizationMember DTO
            if hasattr(data, "members") and data.members is not None:
                result["members"] = list(data.members) if data.members else []
            else:
                result["members"] = []
            # Include environments if loaded - Pydantic will serialize them using Environment DTO
            if hasattr(data, "environments") and data.environments is not None:
                result["environments"] = list(data.environments) if data.environments else []
            else:
                result["environments"] = []
            # Include groups if loaded - Pydantic will serialize them using Group DTO
            if hasattr(data, "groups") and data.groups is not None:
                result["groups"] = list(data.groups) if data.groups else []
            else:
                result["groups"] = []
            return result
        # Handle dict
        elif isinstance(data, dict):
            if "created_at" in data and isinstance(data["created_at"], datetime):
                data["created_at"] = data["created_at"].isoformat()
            # Convert owner_user_id (int) to owner UUID and include owner_email if owner relationship is loaded
            if "owner" in data and data["owner"]:
                if hasattr(data["owner"], "uuid"):
                    data["owner_user_id"] = data["owner"].uuid
                if hasattr(data["owner"], "email"):
                    data["owner_email"] = data["owner"].email
            # Ensure members is a list if not present
            if "members" not in data:
                data["members"] = []
            # Ensure environments is a list if not present
            if "environments" not in data:
                data["environments"] = []
            # Ensure groups is a list if not present
            if "groups" not in data:
                data["groups"] = []
        return data

    model_config = ConfigDict(
        from_attributes=True,
    )
