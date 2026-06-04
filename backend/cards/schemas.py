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
    base_point_value: Decimal = Field(
        default=Decimal("1.00"),
        max_digits=6,
        decimal_places=4,
        description="Default monetary value (INR) of a single reward point for this card."
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
    fee_waiver_spend_threshold: Decimal | None = Field(
        default=None,
        max_digits=12,
        decimal_places=2,
        ge=Decimal("0.00"),
    )
    base_point_value: Decimal | None = Field(
        default=None,
        max_digits=6,
        decimal_places=4,
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
    base_point_value: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
    reward_rules_json: list[dict] | dict | None = None
    milestones_json: list[dict] | dict | None = None

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
    card_status: str | None = Field(default=None)
    user_override_annual_fee: Decimal | None = Field(
        default=None,
        max_digits=12,
        decimal_places=2,
        ge=Decimal("0.00"),
    )
    user_override_fee_waiver_threshold: Decimal | None = Field(
        default=None,
        max_digits=14,
        decimal_places=2,
        ge=Decimal("0.00"),
    )
    # Frontend aliases for progressive editing
    annual_fee: Decimal | None = Field(default=None, max_digits=12, decimal_places=2, ge=Decimal("0.00"))
    fee_waiver_target: Decimal | None = Field(default=None, max_digits=14, decimal_places=2, ge=Decimal("0.00"))
    current_cycle_spend: Decimal | None = Field(default=None, max_digits=14, decimal_places=2, ge=Decimal("0.00"))
    annual_fee_debit_date: date | None = Field(default=None)

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
    annual_fee_debit_date: date | None = None
    card_status: str
    created_at: datetime
    updated_at: datetime
    card_details: CardCatalogResponse | None = None

    # Fee intelligence
    catalog_annual_fee: Decimal | None = None
    user_override_annual_fee: Decimal | None = None
    effective_annual_fee: Decimal | None = None
    fee_confidence: str | None = None

    # Enriched intelligence fields (populated by service/intelligence layer)
    fee_waiver_threshold: Decimal | None = None
    user_override_fee_waiver_threshold: Decimal | None = None
    effective_fee_waiver_threshold: Decimal | None = None
    fee_waiver_progress_percent: float | None = None
    remaining_spend_for_waiver: Decimal | None = None
    waiver_achieved: bool | None = None
    
    # New Fee Waiver Intelligence Engine Output
    days_until_renewal: int | None = None
    projected_completion_probability: float | None = None
    waiver_value_at_risk: float | None = None
    urgency_level: str | None = None
    comfort_state: str | None = None
    explanation_text: str | None = None

    model_config = ConfigDict(from_attributes=True, extra="forbid")