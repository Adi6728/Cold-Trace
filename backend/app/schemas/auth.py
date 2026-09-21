from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.permissions import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: UserRole
    admin_registration_key: str | None = None
    organization_name: str | None = Field(default=None, description="Required for non-USER roles to associate or create an organization.")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: UserRole
    organization_id: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @property
    def password_hash(self) -> str:  # pragma: no cover
        raise AttributeError("password_hash is not exposed in UserResponse")
