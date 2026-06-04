"""
Module: backend.models.card_catalog
Responsibility: Defines the master credit card catalog entity.

Architectural Boundaries:
- Data persistence only — no business logic, no methods beyond field definitions.
- Represents globally available card definitions (not user-specific).
- Uses SQLModel for both DB table definition and Pydantic validation.

TODO:
- Add JSONB column for flexible card benefit rules when reward engine is integrated.
- Add network enum validation when card network types are finalized.
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Dict
from uuid import UUID, uuid4
from sqlalchemy import Column, JSON

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from models.user_card import UserCard


class CardCatalog(SQLModel, table=True):
    """Master catalog of globally available credit card definitions.

    This table stores the canonical definition of each credit card
    that can be added by any user to their collection. It is NOT
    user-specific — see UserCard for user-owned card instances.

    Attributes:
        id: Auto-generated UUID primary key.
        card_name: Display name of the credit card (e.g., "HDFC Millennia").
        bank_name: Issuing bank name (e.g., "HDFC Bank").
        network: Payment network (e.g., "Visa", "Mastercard", "Rupay").
        joining_fee: One-time fee charged when the card is first issued (INR).
        annual_fee: Recurring annual fee (INR).
        is_active: Whether this card definition is currently offered by the bank.
        created_at: UTC timestamp of catalog entry creation.
        updated_at: UTC timestamp of last modification.
    """

    __tablename__ = "card_catalogs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    card_name: str = Field(max_length=200, index=True)
    bank_name: str = Field(max_length=200, index=True)
    normalized_card_key: str | None = Field(default=None, max_length=255, index=True, unique=True)
    network: str = Field(max_length=50)
    joining_fee: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=12,
        decimal_places=2,
    )
    annual_fee: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=12,
        decimal_places=2,
    )
    fee_waiver_spend_threshold: Decimal | None = Field(
        default=None,
        max_digits=12,
        decimal_places=2,
        description="Amount of annual spend required to waive the annual fee.",
    )
    base_point_value: Decimal = Field(
        default=Decimal("1.00"),
        max_digits=6,
        decimal_places=4,
        description="Default monetary value (INR) of a single reward point for this card."
    )
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
    
    # ---- New Pipeline Integration ----
    reward_rules_json: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON)
    )
    milestones_json: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON)
    )
    is_approved: bool = Field(default=False)

    # ---- Relationships ----
    user_cards: list["UserCard"] = Relationship(
        back_populates="card_catalog",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
