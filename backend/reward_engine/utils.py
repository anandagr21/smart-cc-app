"""
Module: backend.reward_engine.utils
Responsibility: Pure utility functions for the deterministic reward engine.

Architectural Boundaries:
- Pure functions — no I/O, no side effects, no randomness.
- Shared utilities consumed by evaluator, matcher, and other engine modules.
- MUST NOT depend on DB models, services, or routes.
"""

from __future__ import annotations

from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from reward_engine.constants import MINIMUM_SPEND_DEFAULT, ONE_HUNDRED, ZERO_DECIMAL
from reward_engine.exceptions import InvalidTransactionError

# Number of decimal places for INR currency precision.
INR_PRECISION: int = 2


def to_decimal(value: float | int | Decimal | str) -> Decimal:
    """Convert a numeric value to Decimal with safe coercion.

    All monetary calculations in the engine use Decimal for deterministic
    precision. This utility ensures consistent conversion from various
    input types.

    Args:
        value: A float, int, Decimal, or numeric string.

    Returns:
        A Decimal instance.

    Raises:
        ValueError: If the string cannot be parsed as a number.
    """
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def round_inr(value: Decimal) -> Decimal:
    """Round a monetary value to 2 decimal places (INR precision).

    Uses banker's rounding (HALF_UP) for predictable, deterministic results.

    Args:
        value: The raw Decimal value.

    Returns:
        The value rounded to 2 decimal places.
    """
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def percentage_to_decimal(rate: float | Decimal) -> Decimal:
    """Convert a percentage rate (e.g., 0.10 for 10%) to a Decimal factor.

    Args:
        rate: Reward rate as a decimal (0.0 to 1.0).

    Returns:
        The equivalent Decimal factor.
    """
    return to_decimal(rate)


def calculate_percentage_of(amount: Decimal, rate: Decimal) -> Decimal:
    """Calculate (amount × rate) and round to INR precision.

    This is the core computation for percentage-based cashback.

    Args:
        amount: Transaction amount in INR.
        rate: Reward rate as a decimal between 0.0 and 1.0.

    Returns:
        The reward amount in INR, rounded to 2 decimal places.

    Example:
        >>> calculate_percentage_of(Decimal("1000"), Decimal("0.10"))
        Decimal('100.00')
    """
    raw = amount * rate
    return round_inr(raw)


def validate_transaction_amount(amount: Decimal) -> None:
    """Validate that transaction amount is a positive value.

    Args:
        amount: The transaction amount to validate.

    Raises:
        InvalidTransactionError: If amount is not a positive number.
    """
    if not isinstance(amount, Decimal):
        amount = to_decimal(amount)
    if amount <= ZERO_DECIMAL:
        raise InvalidTransactionError(
            f"Transaction amount must be positive. Got: {amount}",
            details={"amount": str(amount)},
        )


def check_minimum_spend(amount: Decimal, min_spend: Decimal | None) -> bool:
    """Check if transaction amount meets the minimum spend requirement.

    Args:
        amount: Transaction amount in INR.
        min_spend: Minimum spend threshold. None or 0 means no minimum.

    Returns:
        True if the amount meets or exceeds the minimum spend threshold.
    """
    if min_spend is None:
        return True
    threshold = to_decimal(min_spend) if not isinstance(min_spend, Decimal) else min_spend
    return amount >= threshold


def is_within_validity_window(
    transaction_date: date | None,
    valid_from: date | None,
    valid_to: date | None,
) -> bool:
    """Check if a transaction date falls within a rule's validity window.

    Args:
        transaction_date: The date of the transaction. None means "always valid."
        valid_from: Start of validity period (inclusive). None means no start bound.
        valid_to: End of validity period (inclusive). None means no end bound.

    Returns:
        True if the transaction is within the validity window, or if no
        validity constraints are defined.
    """
    if transaction_date is None:
        # No transaction date provided — assume valid.
        return True
    if valid_from is not None and transaction_date < valid_from:
        return False
    if valid_to is not None and transaction_date > valid_to:
        return False
    return True


def calculate_point_value_inr(
    points: int,
    rupee_value_per_point: Decimal,
) -> Decimal:
    """Convert reward points to INR equivalent.

    Args:
        points: Number of reward points earned.
        rupee_value_per_point: Value of 1 point in INR.

    Returns:
        Total INR value of the points, rounded to 2 decimal places.

    Example:
        >>> calculate_point_value_inr(200, Decimal("0.25"))
        Decimal('50.00')
    """
    rvp = to_decimal(rupee_value_per_point) if not isinstance(rupee_value_per_point, Decimal) else rupee_value_per_point
    raw = Decimal(str(points)) * rvp
    return round_inr(raw)


def normalize_merchant(merchant: str) -> str:
    """Normalize a merchant name for matching.

    Applies:
    - Strip whitespace.
    - Convert to lowercase.
    - Replace consecutive whitespace with a single space.

    Args:
        merchant: Raw merchant name string.

    Returns:
        Normalized merchant name.
    """
    import re

    return re.sub(r"\s+", " ", merchant.strip().lower())


def compute_points(
    amount: Decimal,
    spend_unit: Decimal,
    points_per_unit: Decimal,
    multiplier: Decimal | None = None,
) -> int:
    """Compute reward points from spend.

    Points are calculated as: floor(amount / spend_unit) × points_per_unit × multiplier

    Args:
        amount: Transaction amount in INR.
        spend_unit: Spend needed to earn base points (e.g., ₹100).
        points_per_unit: Base points earned per spend_unit.
        multiplier: Optional multiplier (e.g., 5x = 5). Defaults to 1.

    Returns:
        Integer number of reward points earned.

    Example:
        >>> compute_points(Decimal("1000"), Decimal("100"), Decimal("2"), Decimal("5"))
        100  # (1000/100) = 10 × 2 = 20 × 5 = 100
    """
    if spend_unit <= ZERO_DECIMAL:
        return 0
    mult = multiplier if multiplier is not None else Decimal("1")
    units = int(amount // spend_unit)
    return int(units * points_per_unit * mult)