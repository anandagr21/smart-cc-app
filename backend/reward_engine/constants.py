"""
Module: backend.reward_engine.constants
Responsibility: Pure constants and enums for the deterministic reward engine.

Architectural Boundaries:
- Pure data definitions — no I/O, no business logic.
- Defines canonical reward types, payment modes, and default values.
- Used by all engine sub-modules for type-safe configuration.
"""

from __future__ import annotations

from decimal import Decimal
from enum import StrEnum


# ---------------------------------------------------------------------------
# Reward Types
# ---------------------------------------------------------------------------


class RewardType(StrEnum):
    """Canonical reward types produced by the engine."""

    CASHBACK = "cashback"
    POINTS = "points"
    MILES = "miles"
    VOUCHER = "voucher"
    NONE = "none"


class PaymentMode(StrEnum):
    """Supported payment modes for rule matching."""

    ONLINE = "online"
    OFFLINE = "offline"
    CONTACTLESS = "contactless"
    UPI = "upi"
    INTERNATIONAL = "international"
    ANY = "any"


class CapScope(StrEnum):
    """Scope of a reward cap."""

    PER_TRANSACTION = "per_transaction"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    CATEGORY = "category"
    ANNUAL = "annual"
    MERCHANT = "merchant"


# ---------------------------------------------------------------------------
# Cap Type Constants
# ---------------------------------------------------------------------------

CAP_TYPE_TRANSACTION: str = "transaction_cap"
CAP_TYPE_MONTHLY: str = "monthly_cap"
CAP_TYPE_QUARTERLY: str = "quarterly_cap"
CAP_TYPE_CATEGORY: str = "category_cap"
CAP_TYPE_MERCHANT: str = "merchant_cap"
CAP_TYPE_ANNUAL: str = "annual_cap"

_CAP_TYPE_SET: frozenset[str] = frozenset(
    {CAP_TYPE_TRANSACTION, CAP_TYPE_MONTHLY, CAP_TYPE_QUARTERLY, CAP_TYPE_CATEGORY, CAP_TYPE_MERCHANT, CAP_TYPE_ANNUAL}
)

# Mapping of scope strings to CapScope enum values.
CAP_SCOPE_MAP: dict[str, CapScope] = {
    "per_transaction": CapScope.PER_TRANSACTION,
    "transaction": CapScope.PER_TRANSACTION,
    "monthly": CapScope.MONTHLY,
    "month": CapScope.MONTHLY,
    "quarterly": CapScope.QUARTERLY,
    "quarter": CapScope.QUARTERLY,
    "category": CapScope.CATEGORY,
    "annual": CapScope.ANNUAL,
    "yearly": CapScope.ANNUAL,
    "merchant": CapScope.MERCHANT,
}


class MatchType(StrEnum):
    """Type of rule match that occurred."""

    EXACT_MERCHANT = "exact_merchant"
    MCC_MATCH = "mcc_match"
    CATEGORY_MATCH = "category_match"
    PAYMENT_MODE = "payment_mode"
    DEFAULT = "default"


# ---------------------------------------------------------------------------
# Default Values
# ---------------------------------------------------------------------------

DEFAULT_RUPEE_VALUE_PER_POINT: Decimal = Decimal("0.25")
"""Default redemption rate: 1 point = ₹0.25.

This is a fallback when the card config does not declare a
rupee_value_per_point. The engine returns a warning rather than
silently using this default.
"""

DEFAULT_RUPEE_VALUE_PER_MILE: Decimal = Decimal("0.50")
"""Default valuation: 1 air mile = ₹0.50."""

ZERO_DECIMAL: Decimal = Decimal("0")
"""Reusable zero Decimal to avoid repeated allocations."""

ONE_HUNDRED: Decimal = Decimal("100")
"""Constant for percentage calculations."""

MINIMUM_SPEND_DEFAULT: Decimal = Decimal("0")
"""Default minimum spend threshold when not specified."""

# ---------------------------------------------------------------------------
# Config Key Names (shared across rule_config dicts)
# ---------------------------------------------------------------------------

KEY_MERCHANT: str = "merchant"
KEY_CATEGORY: str = "category"
KEY_REWARD_RATE: str = "reward_rate"
KEY_REWARD_TYPE: str = "reward_type"
KEY_CAP: str = "cap"
KEY_MIN_SPEND: str = "min_spend"
KEY_MAX_REWARD: str = "max_reward"
KEY_EXCLUDED: str = "excluded"
KEY_REASON: str = "reason"
KEY_EXCLUDED_MERCHANTS: str = "excluded_merchants"
KEY_EXCLUDED_CATEGORIES: str = "excluded_categories"
KEY_EXCLUDED_TXN_TYPES: str = "excluded_transaction_types"
KEY_POINTS_MULTIPLIER: str = "points_multiplier"
KEY_SPEND_UNIT: str = "spend_unit"
KEY_POINTS_PER_UNIT: str = "points_per_unit"
KEY_RUPEE_VALUE: str = "rupee_value"
KEY_PAYMENT_MODE: str = "payment_mode"
KEY_VALID_FROM: str = "valid_from"
KEY_VALID_TO: str = "valid_to"
KEY_SCOPE: str = "scope"
KEY_PERIOD: str = "period"

# ---------------------------------------------------------------------------
# Default rule_config shape per reward_type (from rewards module)
# ---------------------------------------------------------------------------

DEFAULT_RULE_CONFIG: dict[str, object] = {
    KEY_REWARD_TYPE: "cashback",
    KEY_REWARD_RATE: 0.0,
    KEY_MIN_SPEND: 0,
    KEY_MAX_REWARD: 0,
    KEY_CAP: 0,
    KEY_POINTS_MULTIPLIER: 1,
    KEY_SPEND_UNIT: 100,
    KEY_POINTS_PER_UNIT: 1,
    KEY_RUPEE_VALUE: float(DEFAULT_RUPEE_VALUE_PER_POINT),
    KEY_PAYMENT_MODE: "any",
}