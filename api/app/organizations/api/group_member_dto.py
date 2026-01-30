from pydantic import BaseModel, ConfigDict, model_validator
from uuid import UUID
from datetime import datetime
from typing import Any


class GroupMemberBase(BaseModel):
    group_id: UUID
    organization_member_id: UUID


class GroupMemberCreate(GroupMemberBase):
    pass


class GroupMember(GroupMemberBase):
    uuid: UUID
    created_at: str

    @model_validator(mode="before")
    @classmethod
    def convert_datetime_to_string(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "created_at" in data and isinstance(data["created_at"], datetime):
                data["created_at"] = data["created_at"].isoformat()
        elif hasattr(data, "__dict__"):
            if hasattr(data, "created_at") and isinstance(data.created_at, datetime):
                data.created_at = data.created_at.isoformat()
        return data

    model_config = ConfigDict(
        from_attributes=True,
    )
