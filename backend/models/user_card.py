"""
Module: backend.models.user_card
Responsibility: Defines the database entity for user-owned credit cards.

Architectural Boundaries:
- Data persistence only — no business logic, no methods beyond field definitions.
- Represents a specific user's instance of a card from the master catalog.
- Foreign key to CardCatalog defines the card template; UserCard adds user-specific data.
- Foreign key to User defines card ownership.

TODO:
- Add relationship to Transaction model when transaction module is built.
- Add spend tracking aggregation fields when analytics module is built.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from models.card_catalog import CardCatalog
    from models.user import User


class UserCard(SQLModel, table=True):
    """User-owned credit card instance.

    Links a user to a specific card from the master catalog and stores
    user-specific metadata such as credit limit, spend tracking, and
    billing cycle dates.

    Attributes:
        id: Auto-generated UUID primary key.
        user_id: Foreign key to the owning user.
        card_catalog_id: Foreign key to the master card catalog entry.
        nickname: Optional user-assigned nickname (e.g., "My Dining Card").
        credit_limit: Maximum credit limit in INR. Cannot be negative.
        current_spend: Spend in the current billing cycle (INR). Cannot be negative.
        annual_spend: Cumulative spend for the card year (INR). Cannot be negative.
        billing_date: Day of month (1-31) when the billing cycle closes.
        due_date: Day of month (1-31) when payment is due.
        fee_cycle_start_date: The start date of the annual fee cycle.
        is_active: Whether the user considers this card active.
        created_at: UTC timestamp when the card was added.
        updated_at: UTC timestamp of last modification.
    """

    __tablename__ = "user_cards"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    card_catalog_id: UUID = Field(
        foreign_key="card_catalogs.id", index=True
    )
    nickname: str | None = Field(default=None, max_length=100)
    credit_limit: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=14,
        decimal_places=2,
    )
    current_spend: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=14,
        decimal_places=2,
    )
    annual_spend: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=14,
        decimal_places=2,
    )
    billing_date: int = Field(default=1, ge=1, le=31)
    due_date: int = Field(default=1, ge=1, le=31)
    fee_cycle_start_date: date | None = Field(
        default=None,
        description="The start date of the annual fee cycle (used to calculate waiver period).",
    )
    annual_fee_debit_date: date | None = Field(
        default=None,
        description="User-facing anchor for when the fee debits.",
    )
    user_override_annual_fee: Decimal | None = Field(
        default=None,
        max_digits=12,
        decimal_places=2,
        ge=Decimal("0.00"),
        description="User-calibrated override for the annual fee.",
    )
    user_override_fee_waiver_threshold: Decimal | None = Field(
        default=None,
        max_digits=14,
        decimal_places=2,
        ge=Decimal("0.00"),
        description="User-calibrated override for the fee waiver threshold.",
    )
    fee_override_updated_at: datetime | None = Field(
        default=None,
        description="UTC timestamp when the user last calibrated the fee.",
    )
    fee_override_source: str | None = Field(
        default=None,
        max_length=50,
        description="Source of the override (e.g., 'USER', 'ISSUER_PROMO').",
    )
    card_status: str = Field(
        default="ACTIVE",
        max_length=20,
        description="Status of the card (e.g. ACTIVE, INACTIVE, LOCKED, CLOSED, EXPIRED)"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    @property
    def effective_annual_fee(self) -> Decimal:
        """Returns the user-calibrated fee if it exists, otherwise falls back to the catalog fee."""
        if self.user_override_annual_fee is not None:
            return self.user_override_annual_fee
        if getattr(self, "card_catalog", None) is not None:
            return self.card_catalog.annual_fee
        return Decimal("0.00")

    @property
    def effective_fee_waiver_threshold(self) -> Decimal | None:
        """Returns the effective waiver threshold."""
        if self.user_override_fee_waiver_threshold is not None:
            return self.user_override_fee_waiver_threshold
        if getattr(self, "card_catalog", None) is not None:
            return self.card_catalog.fee_waiver_spend_threshold
        return None

    @property
    def days_until_fee_debit(self) -> int | None:
        """Calculates days remaining until the fee debit date, with recurring yearly normalization."""
        if not self.annual_fee_debit_date:
            # Fallback to the old logic if we only have fee_cycle_start_date
            if not self.fee_cycle_start_date:
                return None
            target_date = self.fee_cycle_start_date
        else:
            target_date = self.annual_fee_debit_date
            
        today = date.today()
        # Find next anniversary
        try:
            next_renewal = date(today.year, target_date.month, target_date.day)
            if next_renewal < today:
                next_renewal = date(today.year + 1, target_date.month, target_date.day)
            return (next_renewal - today).days
        except ValueError:
            # Handle leap year edge case (Feb 29)
            next_renewal = date(today.year, 3, 1)
            if next_renewal < today:
                next_renewal = date(today.year + 1, 3, 1)
            return (next_renewal - today).days

    @property
    def days_until_renewal(self) -> int | None:
        """Alias for days_until_fee_debit to preserve backward compatibility."""
        return self.days_until_fee_debit

    @property
    def fee_cycle_elapsed_days(self) -> int | None:
        """Difference between today and the cycle start (inferred from debit date)."""
        days = self.days_until_fee_debit
        if days is None:
            return None
        return max(0, 365 - days)

    @property
    def remaining_waiver_spend(self) -> Decimal | None:
        """Amount left to spend to hit the waiver."""
        threshold = self.effective_fee_waiver_threshold
        if not threshold or threshold <= Decimal("0"):
            return None
            
        remaining = threshold - (self.annual_spend or Decimal("0"))
        return max(Decimal("0.00"), remaining)

    @property
    def waiver_progress_percentage(self) -> float | None:
        """Percentage of waiver achieved."""
        threshold = self.effective_fee_waiver_threshold
        if not threshold or threshold <= Decimal("0"):
            return None
            
        progress = float((self.annual_spend or Decimal("0")) / threshold) * 100.0
        return min(100.0, max(0.0, progress))

    # ---- Relationships ----
    card_catalog: "CardCatalog" = Relationship(
        back_populates="user_cards",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    user: "User" = Relationship(
        back_populates="user_cards",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
