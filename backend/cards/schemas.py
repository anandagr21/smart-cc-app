"""
Module: backend.cards.schemas
Responsibility: Pydantic API contracts for Card Management.

Architectural Boundaries:
- Validates incoming API data using Pydantic v2.
- Shapes outgoing API responses.
- MUST NOT contain database mappings or business logic.
- Uses `ConfigDict(extra="forbid")` to reject unknown fields (per skills/api.md).

Validation Rules (per specification):
- billing_date must be between 1-31
- due_date must be between 1-31
- credit_limit cannot be negative
- annual_spend cannot be negative
- current_spend cannot be negative

TODO:
- Add card benefit rules schema when reward engine integration is needed.
"""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Card Catalog Schemas
# ---------------------------------------------------------------------------


class CardCatalogCreate(BaseModel):
    """Request schema for creating a card catalog entry.

    Used by admin endpoints to add new card definitions to the master catalog.
    """

    card_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Display name of the credit card.",
    )
    bank_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Issuing bank name.",
    )
    network: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Payment network (e.g., Visa, Mastercard, Rupay).",
    )
    joining_fee: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=12,
        decimal_places=2,
        ge=Decimal("0.00"),
        description="One-time joining fee in INR.",
    )
    annual_fee: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=12,
        decimal_places=2,
        ge=Decimal("0.00"),
        description="Recurring annual fee in INR.",
    )
    is_active: bool = Field(
        default=True,
        description="Whether this card is currently offered.",
    )

    model_config = ConfigDict(extra="forbid")


class CardCatalogUpdate(BaseModel):
    """Request schema for updating a card catalog entry (partial update).

    All fields are optional — only provided fields will be updated.
    """

    card_name: str | None = Field(
        default=None, min_length=1, max_length=200
    )
    bank_name: str | None = Field(
        default=None, min_length=1, max_length=200
    )
    network: str | None = Field(
        default=None, min_length=1, max_length=50
    )
    joining_fee: Decimal | None = Field(
        default=None,
        max_digits=12,
        decimal_places=2,
        ge=Decimal("0.00"),
    )
    annual_fee: Decimal | None = Field(
        default=None,
        max_digits=12,
        decimal_places=2,
        ge=Decimal("0.00"),
    )
    is_active: bool | None = Field(default=None)

    model_config = ConfigDict(extra="forbid")


class CardCatalogResponse(BaseModel):
    """Response schema for a single card catalog entry."""

    id: UUID
    card_name: str
    bank_name: str
    network: str
    joining_fee: Decimal
    annual_fee: Decimal
    fee_waiver_spend_threshold: Decimal | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, extra="forbid")


# ---------------------------------------------------------------------------
# User Card Schemas
# ---------------------------------------------------------------------------


class UserCardCreate(BaseModel):
    """Request schema for creating a user-owned card.

    Links a user to a card from the master catalog and stores
    user-specific metadata.
    """

    card_catalog_id: UUID = Field(
        ...,
        description="ID of the card definition from the master catalog.",
    )
    nickname: str | None = Field(
        default=None,
        max_length=100,
        description="Optional user-assigned label for this card.",
    )
    credit_limit: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=14,
        decimal_places=2,
        ge=Decimal("0.00"),
        description="Maximum credit limit in INR.",
    )
    current_spend: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=14,
        decimal_places=2,
        ge=Decimal("0.00"),
        description="Spend in the current billing cycle in INR.",
    )
    annual_spend: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=14,
        decimal_places=2,
        ge=Decimal("0.00"),
        description="Cumulative spend for the card year in INR.",
    )
    billing_date: int = Field(
        default=1,
        ge=1,
        le=31,
        description="Day of month (1-31) when billing cycle closes.",
    )
    due_date: int = Field(
        default=1,
        ge=1,
        le=31,
        description="Day of month (1-31) when payment is due.",
    )

    model_config = ConfigDict(extra="forbid")


class UserCardUpdate(BaseModel):
    """Request schema for updating a user-owned card (partial update).

    All fields are optional — only provided fields will be updated.
    """

    nickname: str | None = Field(
        default=None,
        max_length=100,
    )
    credit_limit: Decimal | None = Field(
        default=None,
        max_digits=14,
        decimal_places=2,
        ge=Decimal("0.00"),
    )
    current_spend: Decimal | None = Field(
        default=None,
        max_digits=14,
        decimal_places=2,
        ge=Decimal("0.00"),
    )
    annual_spend: Decimal | None = Field(
        default=None,
        max_digits=14,
        decimal_places=2,
        ge=Decimal("0.00"),
    )
    billing_date: int | None = Field(
        default=None,
        ge=1,
        le=31,
    )
    due_date: int | None = Field(
        default=None,
        ge=1,
        le=31,
    )
    is_active: bool | None = Field(default=None)

    model_config = ConfigDict(extra="forbid")


class UserCardResponse(BaseModel):
    """Response schema for a single user-owned card.

    Includes the card catalog details nested for convenience
    on the frontend (avoids an extra API call).
    Also includes dynamic fee waiver tracking fields computed at runtime.
    """

    id: UUID
    user_id: UUID
    card_catalog_id: UUID
    nickname: str | None
    credit_limit: Decimal
    current_spend: Decimal
    annual_spend: Decimal
    billing_date: int
    due_date: int
    fee_cycle_start_date: datetime | date | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    # Nested catalog data — populated by the service layer
    card_details: CardCatalogResponse | None = None

    # Enriched intelligence fields (populated by service/intelligence layer)
    fee_waiver_threshold: Decimal | None = None
    fee_waiver_progress_percent: float | None = None
    remaining_spend_for_waiver: Decimal | None = None
    waiver_achieved: bool | None = None
    projected_waiver_status: str | None = None

    model_config = ConfigDict(from_attributes=True, extra="forbid")