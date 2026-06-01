"""
Module: backend.merchants.models
Responsibility: Database entities for the merchant normalization module.

Architectural Boundaries:
- Data persistence only — no business logic, no methods beyond field definitions.
- Uses SQLModel for both DB table definition and Pydantic validation.
- Merchant stores canonical identities; MerchantAlias stores alternate names.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, Index, String, UniqueConstraint
from sqlalchemy.types import JSON
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlmodel import Field, Relationship, SQLModel


if TYPE_CHECKING:
    from .models import MerchantAlias


class Merchant(SQLModel, table=True):
    """Canonical merchant identity — the single source of truth for a merchant.

    Each row represents one real-world merchant (e.g., "dominos", "amazon pay").
    Raw transaction names (aliases) are mapped to this canonical identity
    via the MerchantAlias table.

    Attributes:
        id: UUID primary key.
        canonical_name: Normalized canonical name (e.g., "dominos", "amazon pay").
        display_name: Human-friendly display name (e.g., "Domino's Pizza").
        category: Deterministic category (e.g., "food", "ecommerce").
        normalized_tokens: JSONB array of unique normalized tokens extracted
            from the canonical name. Stored as JSONB for efficient
            PostgreSQL array containment queries (@> operator).
        aliases_list: JSONB array of known raw aliases for this merchant.
            Denormalized for fast lookups — MerchantAlias is still the
            authoritative source.
        is_active: Whether this merchant identity is currently in use.
        created_at: UTC timestamp of creation.
        updated_at: UTC timestamp of last modification.
    """

    __tablename__ = "merchants"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(), primary_key=True, default=uuid.uuid4),
    )
    canonical_name: str = Field(
        max_length=300,
        unique=True,
        index=True,
        description="Normalized canonical merchant name",
    )
    display_name: str = Field(
        max_length=500,
        default="",
        description="Human-readable display name",
    )
    category: str = Field(
        max_length=50,
        default="unknown",
        index=True,
        description="Merchant category (food, grocery, fuel, etc.)",
    )
    normalized_tokens: list = Field(
        default_factory=list,
        sa_column=Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list),
        description="JSON array of unique tokens for this canonical merchant",
    )
    aliases_list: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list),
        description="JSONB denormalized alias list for fast lookups",
    )
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    # ---- Relationships ---
    aliases: List["MerchantAlias"] = Relationship(
        back_populates="merchant",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )

    # ---- Table-level Indexes ---
    __table_args__ = (
        Index("ix_merchants_normalized_tokens_gin", "normalized_tokens", postgresql_using="gin"),
        Index("ix_merchants_category_idx", "category"),
    )


class MerchantAlias(SQLModel, table=True):
    """Alternate merchant name — maps raw transaction names to canonical merchants.

    Each row records one raw merchant name that was mapped to a canonical
    Merchant. Multiple aliases can point to the same merchant.

    Examples:
        Raw: "DOMINOS PIZZA" → canonical: "dominos"
        Raw: "DP ONLINE"     → canonical: "dominos"
        Raw: "DOMINOS INDIA" → canonical: "dominos"

    Attributes:
        id: UUID primary key.
        merchant_id: FK to merchants table.
        raw_name: The original raw merchant name from a transaction.
        normalized_name: Normalized form of the raw name (post-pipeline).
        normalized_tokens: JSONB array of normalized tokens from the raw name.
        source: Origin of this alias (e.g., "manual", "statement", "user").
        is_active: Whether this alias is still valid.
        created_at: UTC timestamp of creation.
    """

    __tablename__ = "merchant_aliases"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(), primary_key=True, default=uuid.uuid4),
    )
    merchant_id: uuid.UUID = Field(
        foreign_key="merchants.id",
        nullable=False,
        index=True,
        description="FK to the canonical merchant",
    )
    raw_name: str = Field(
        max_length=500,
        description="Original raw merchant name from a transaction",
    )
    normalized_name: str = Field(
        max_length=300,
        index=True,
        description="Normalized form of the raw name",
    )
    normalized_tokens: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list),
        description="JSON array of unique tokens for matching",
    )
    source: str = Field(
        max_length=50,
        default="manual",
        description="Origin of this alias (manual, statement, user)",
    )
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # ---- Relationships ---
    merchant: "Merchant" = Relationship(back_populates="aliases")

    # ---- Table-level Constraints ---
    __table_args__ = (
        UniqueConstraint("merchant_id", "normalized_name", name="uq_alias_merchant_normalized"),
        Index("ix_merchant_aliases_normalized_tokens_gin", "normalized_tokens", postgresql_using="gin"),
    )