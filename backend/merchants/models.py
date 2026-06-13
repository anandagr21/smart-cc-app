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
from enum import Enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, Index, String, UniqueConstraint, Float
from sqlalchemy.types import JSON
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlmodel import Field, Relationship, SQLModel


if TYPE_CHECKING:
    from .models import MerchantAlias


class MerchantType(str, Enum):
    BRAND = "BRAND"
    LOCAL_BUSINESS = "LOCAL_BUSINESS"
    ONLINE_STORE = "ONLINE_STORE"
    UTILITY = "UTILITY"
    BANK = "BANK"
    GOVERNMENT = "GOVERNMENT"
    EDUCATION = "EDUCATION"
    TRAVEL = "TRAVEL"
    HEALTHCARE = "HEALTHCARE"
    UNKNOWN = "UNKNOWN"


class PendingReviewStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


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
        merchant_type: Merchant classification (BRAND, UTILITY, GOVERNMENT, etc.)
        mcc_hint: Optional MCC code hint for reward engine use.
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
    merchant_type: str = Field(
        max_length=50,
        default=MerchantType.UNKNOWN,
        index=True,
        description="Merchant classification (BRAND, UTILITY, GOVERNMENT, etc.)",
    )
    mcc_hint: Optional[str] = Field(
        default=None,
        max_length=10,
        description="MCC code hint for reward engine (e.g. '5411' for grocery stores)",
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
        Index("ix_merchants_merchant_type_idx", "merchant_type"),
    )


class MerchantAlias(SQLModel, table=True):
    """Alternate merchant name — maps raw transaction names to canonical merchants.

    Each row records one raw merchant name that was mapped to a canonical
    Merchant. Multiple aliases can point to the same merchant.

    Attributes:
        id: UUID primary key.
        merchant_id: FK to merchants table.
        raw_name: The original raw merchant name from a transaction.
        normalized_name: Normalized form of the raw name (post-pipeline).
        normalized_tokens: JSONB array of normalized tokens from the raw name.
        source: Origin of this alias (SYSTEM, LLM, USER_CONFIRMED).
        confidence: Match confidence when this alias was learned (0.0-1.0).
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
        default="SYSTEM",
        description="Origin of this alias (SYSTEM, LLM, USER_CONFIRMED)",
    )
    confidence: float = Field(
        default=1.0,
        description="Confidence score when this alias was learned (0.0-1.0)",
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


class MerchantAliasLearning(SQLModel, table=True):
    """Tracks user-confirmed alias corrections for progressive alias learning.

    Each row represents a user confirming that a raw input resolves to a
    specific merchant. When confirmation_count reaches the promotion threshold,
    the alias is automatically added to merchant_aliases.
    """

    __tablename__ = "merchant_alias_learning"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(), primary_key=True, default=uuid.uuid4),
    )
    alias: str = Field(
        max_length=500,
        index=True,
        description="The raw input alias being learned",
    )
    normalized_alias: str = Field(
        max_length=300,
        index=True,
        description="Normalized form of the alias",
    )
    merchant_id: uuid.UUID = Field(
        foreign_key="merchants.id",
        nullable=False,
        index=True,
        description="FK to the canonical merchant this alias maps to",
    )
    confirmation_count: int = Field(
        default=1,
        description="Number of times users have confirmed this mapping",
    )
    last_confirmed_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("normalized_alias", "merchant_id", name="uq_alias_learning_norm_merchant"),
    )


class MerchantPendingReview(SQLModel, table=True):
    """Holds newly discovered merchants awaiting admin triage.

    When LLM Discovery identifies a merchant not in the database with
    confidence >= 0.90, it creates a pending review record. Admins can
    approve (creating a canonical merchant) or reject it.
    """

    __tablename__ = "merchant_pending_review"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(), primary_key=True, default=uuid.uuid4),
    )
    raw_input: str = Field(
        max_length=500,
        description="Original raw user input that triggered discovery",
    )
    suggested_name: str = Field(
        max_length=500,
        description="LLM-suggested canonical merchant name",
    )
    category: str = Field(max_length=50, default="unknown")
    subcategory: Optional[str] = Field(default=None, max_length=100)
    merchant_type: str = Field(
        max_length=50,
        default=MerchantType.UNKNOWN,
        description="LLM-suggested merchant type",
    )
    mcc_hint: Optional[str] = Field(
        default=None,
        max_length=10,
        description="LLM-suggested MCC code hint",
    )
    is_known_brand: bool = Field(
        default=False,
        description="Whether the LLM believes this is a known brand",
    )
    confidence: float = Field(
        description="LLM confidence score (0.0-1.0)",
    )
    status: str = Field(
        default=PendingReviewStatus.PENDING,
        index=True,
        description="Review status: PENDING, APPROVED, REJECTED",
    )
    admin_notes: Optional[str] = Field(default=None, max_length=1000)
    approved_merchant_id: Optional[uuid.UUID] = Field(
        default=None,
        description="FK to the created merchant after approval",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = Field(default=None)


class MerchantResolutionMetric(SQLModel, table=True):
    """Telemetry record for each merchant resolution attempt.

    Enables dashboard reporting of resolution distribution, LLM usage,
    cache hit rates, and alias promotion events.
    """

    __tablename__ = "merchant_resolution_metrics"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(), primary_key=True, default=uuid.uuid4),
    )
    raw_input: str = Field(max_length=500, description="Original raw input")
    normalized_input: str = Field(max_length=300, description="Normalized form")
    resolution_type: str = Field(
        max_length=50,
        index=True,
        description="ALIAS, FUZZY_AUTO, LLM_RECOVERY, LLM_DISCOVERY, USER_CONFIRMED, UNKNOWN",
    )
    confidence: float = Field(description="Final resolution confidence")
    fuzzy_score: Optional[float] = Field(
        default=None,
        description="RapidFuzz score (if fuzzy stage was reached)",
    )
    llm_called: bool = Field(default=False, description="Whether LLM was invoked")
    cache_hit: bool = Field(default=False, description="Whether result came from cache")
    merchant_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Resolved merchant ID (null for UNKNOWN)",
    )
    resolved_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_resolution_metrics_type_date", "resolution_type", "resolved_at"),
    )