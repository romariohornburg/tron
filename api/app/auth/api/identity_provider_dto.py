from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class IdentityProviderBase(BaseModel):
    slug: str = Field(..., min_length=1, max_length=64)
    display_name: str = Field(..., min_length=1, max_length=255)
    client_id: str = Field(..., min_length=1, max_length=512)
    authorization_url: str = Field(..., min_length=1, max_length=1024)
    token_url: str = Field(..., min_length=1, max_length=1024)
    userinfo_url: Optional[str] = Field(None, max_length=1024)
    scopes: str = Field(default="openid email profile", max_length=512)
    is_enabled: bool = True
    organization_id: Optional[int] = None

    @field_validator(
        "slug",
        "display_name",
        "client_id",
        "authorization_url",
        "token_url",
        "userinfo_url",
        "scopes",
        mode="before",
    )
    @classmethod
    def strip_strings(cls, v):
        if v is not None and isinstance(v, str):
            return v.strip() or v
        return v


class IdentityProviderCreate(IdentityProviderBase):
    client_secret: str = Field(..., min_length=1)


class IdentityProviderUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    client_id: Optional[str] = Field(None, min_length=1, max_length=512)
    client_secret: Optional[str] = Field(None, min_length=1)
    authorization_url: Optional[str] = Field(None, min_length=1, max_length=1024)
    token_url: Optional[str] = Field(None, min_length=1, max_length=1024)
    userinfo_url: Optional[str] = Field(None, max_length=1024)
    scopes: Optional[str] = Field(None, max_length=512)
    is_enabled: Optional[bool] = None
    organization_id: Optional[int] = None

    @field_validator(
        "display_name",
        "client_id",
        "client_secret",
        "authorization_url",
        "token_url",
        "userinfo_url",
        "scopes",
        mode="before",
    )
    @classmethod
    def strip_strings(cls, v):
        if v is not None and isinstance(v, str):
            s = v.strip()
            return s if s else None
        return v


class IdentityProviderResponse(BaseModel):
    id: int
    uuid: str
    slug: str
    display_name: str
    client_id: str
    client_secret_masked: Optional[str] = None
    authorization_url: str
    token_url: str
    userinfo_url: Optional[str] = None
    scopes: str
    is_enabled: bool
    organization_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IdentityProviderPublic(BaseModel):
    """For login page: only slug and display_name."""

    slug: str
    display_name: str
