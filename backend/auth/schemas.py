"""
Module: backend.auth.schemas
Responsibility: Pydantic request/response contracts for authentication endpoints.

Architectural Boundaries:
- Pure schema definitions — no business logic, no DB access.
- Extends schemas/common.py for response wrappers.
- All schemas use ConfigDict(extra="forbid") for strict validation.
"""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models.enums import UserRole


class UserRegisterRequest(BaseModel):
    """Request schema for POST /auth/register."""

    email: EmailStr = Field(..., description="User email address (unique).")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Plaintext password (min 8 chars).",
    )
    full_name: str = Field(
        ..., min_length=1, max_length=200, description="User's display name."
    )

    model_config = ConfigDict(extra="forbid")


class UserLoginRequest(BaseModel):
    """Request schema for POST /auth/login."""

    email: EmailStr = Field(..., description="Registered email address.")
    password: str = Field(..., description="Plaintext password.")

    model_config = ConfigDict(extra="forbid")


class UserResponse(BaseModel):
    """Response schema for the authenticated user (safe for API exposure)."""

    id: UUID = Field(..., description="User UUID.")
    email: str = Field(..., description="User email address.")
    full_name: str = Field(..., description="User display name.")
    role: UserRole = Field(default=UserRole.USER, description="User role.")

    model_config = ConfigDict(extra="forbid")


class TokenResponse(BaseModel):
    """Response schema containing JWT access token and user info."""

    access_token: str = Field(..., description="Signed JWT access token.")
    token_type: str = Field(default="bearer", description="Token type.")
    user: UserResponse = Field(..., description="Authenticated user data.")

    model_config = ConfigDict(extra="forbid")