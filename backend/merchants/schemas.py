"""
Module: backend.merchants.schemas
Responsibility: Pydantic API contracts for Merchant Normalization.

Architectural Boundaries:
- Validates incoming API data using Pydantic v2.
- Shapes outgoing API responses.
- MUST NOT contain database mappings or business logic.
- Uses `ConfigDict(extra="forbid")` to reject unknown fields (per skills/api.md).
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Normalize Request / Response
# ---------------------------------------------------------------------------


class NormalizeRequest(BaseModel):
    """Request to normalize a raw merchant name.

    The normalization pipeline is fully deterministic — no AI involved.
    """

    raw_name: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Raw merchant name to normalize (e.g., 'DOMINOS PIZZA').",
    )

    model_config = ConfigDict(extra="forbid")


class NormalizeResponse(BaseModel):
    """Response containing the normalized merchant name and its tokens.

    The `canonical_name` field holds the fully normalized canonical form.
    `tokens` lists the unique ordered tokens extracted during normalization.
    """

    raw_name: str = Field(..., description="Original raw input name")
    canonical_name: str = Field(..., description="Normalized canonical form")
    tokens: list[str] = Field(
        default_factory=list, description="Unique normalized tokens"
    )
    category: str | None = Field(
        default=None, description="Deterministic category if mappable"
    )

    model_config = ConfigDict(extra="forbid")


# ---------------------------------------------------------------------------
# Merchant CRUD Schemas
# ---------------------------------------------------------------------------


class MerchantCreate(BaseModel):
    """Request schema for creating a canonical merchant.

    `display_name` is optional — if omitted, defaults to `canonical_name`.
    `category` defaults to "unknown" when not explicitly provided.
    """

    canonical_name: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="Normalized canonical name (e.g., 'dominos').",
    )
    display_name: str | None = Field(
        default=None,
        max_length=500,
        description="Human-readable display name. Defaults to canonical_name.",
    )
    category: str | None = Field(
        default=None,
        max_length=50,
        description="Merchant category. Auto-detected if omitted.",
    )
    aliases: list[str] | None = Field(
        default=None,
        description="Optional list of raw alias names to register.",
    )

    model_config = ConfigDict(extra="forbid")


class MerchantUpdate(BaseModel):
    """Request schema for updating a merchant (partial update).

    All fields are optional — only provided fields will be updated.
    """

    canonical_name: str | None = Field(
        default=None, min_length=1, max_length=300
    )
    display_name: str | None = Field(
        default=None, min_length=1, max_length=500
    )
    category: str | None = Field(
        default=None, max_length=50
    )
    is_active: bool | None = Field(default=None)
    aliases: list[str] | None = Field(
        default=None,
        description="Replacement alias list. Merged if not None.",
    )

    model_config = ConfigDict(extra="forbid")


class AliasRegisterRequest(BaseModel):
    """Request schema for registering a raw alias against a merchant."""

    raw_name: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Raw merchant name to register as an alias.",
    )
    source: str = Field(
        default="manual",
        max_length=50,
        description="Source of this alias (manual, statement, user).",
    )

    model_config = ConfigDict(extra="forbid")


class MerchantAliasResponse(BaseModel):
    """Response schema for a single merchant alias."""

    id: UUID
    raw_name: str
    normalized_name: str
    source: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, extra="forbid")


class MerchantResponse(BaseModel):
    """Response schema for a single canonical merchant.

    Includes the denormalized alias list for convenience on the frontend.
    """

    id: UUID
    canonical_name: str
    display_name: str
    category: str
    aliases: list[MerchantAliasResponse] = Field(default_factory=list)
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, extra="forbid")


class MerchantBriefResponse(BaseModel):
    """Lightweight response schema for search results.

    Omits aliases and timestamps to keep list/search payloads compact.
    """

    id: UUID
    canonical_name: str
    display_name: str
    category: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True, extra="forbid")


# ---------------------------------------------------------------------------
# Search Schemas
# ---------------------------------------------------------------------------


class MerchantSearchRequest(BaseModel):
    """Request schema for searching merchants by raw name or query.

    `raw_name` is passed through the normalization pipeline, then matched
    against the canonical merchant table using the deterministic matcher.
    """

    raw_name: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Raw merchant name to search for.",
    )
    include_inactive: bool = Field(
        default=False,
        description="Include inactive merchants in results.",
    )

    model_config = ConfigDict(extra="forbid")


class MerchantSearchResponse(BaseModel):
    """Response schema for a merchant search result.

    Returns the best match (if any) plus a score indicating match confidence.
    """

    merchant: MerchantResponse | None = Field(
        default=None, description="Best-matching merchant, or None if no match"
    )
    match_type: str = Field(
        default="none",
        description="Match type: exact, alias, token, partial, or none",
    )
    score: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Match confidence score (0-1)"
    )

    model_config = ConfigDict(extra="forbid")