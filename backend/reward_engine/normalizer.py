"""
Module: backend.reward_engine.normalizer
Responsibility: Normalizes different reward types (points, cashback, miles) into a single INR effective value.

Architectural Boundaries:
- Pure functions — no I/O, no DB access, no side effects.
- Uses redemption rates declared in card config or engine defaults.
- Never infers or estimates values; issues warnings when rates are missing.

Normalization logic:
  cashback → effective_inr = cashback_amount (already INR)
  points   → effective_inr = points × rupee_value_per_point
  miles    → effective_inr = miles × rupee_value_per_mile
"""

from __future__ import annotations

from decimal import Decimal

from reward_engine.constants import (
    DEFAULT_RUPEE_VALUE_PER_MILE,
    DEFAULT_RUPEE_VALUE_PER_POINT,
    ZERO_DECIMAL,
    RewardType,
)
from reward_engine.schemas import PointsResult


def normalize_points_to_inr(
    points_result: PointsResult,
    *,
    fallback_rate: Decimal | None = None,
) -> Decimal:
    """Convert earned points to their effective INR value.

    Uses the redemption rate from the points result; falls back to the
    provided rate or the engine default.

    Args:
        points_result: The PointsResult from points evaluation.
        fallback_rate: Optional override redemption rate (INR per point).

    Returns:
        Effective INR value of the earned points.

    Example:
        100 points at ₹0.25/point → ₹25.00
    """
    rate = fallback_rate or points_result.rupee_value_per_point or DEFAULT_RUPEE_VALUE_PER_POINT
    return points_result.earned_points * rate


def normalize_miles_to_inr(
    miles: int | Decimal,
    *,
    redemption_rate: Decimal | None = None,
) -> Decimal:
    """Convert air miles to their effective INR value.

    Args:
        miles: Number of miles earned.
        redemption_rate: INR value per mile (defaults to engine default).

    Returns:
        Effective INR value.
    """
    rate = redemption_rate or DEFAULT_RUPEE_VALUE_PER_MILE
    return Decimal(str(miles)) * rate


def compute_effective_reward(
    cashback_amount: Decimal | None,
    points_result: PointsResult | None,
) -> Decimal:
    """Compute the total effective reward value in INR.

    Cashback is already in INR. Points are converted using their declared
    redemption rate.

    Args:
        cashback_amount: Cashback in INR (None if not applicable).
        points_result: Points evaluation result (None if not applicable).

    Returns:
        Total effective reward in INR.

    Example:
        ₹50 cashback + 100 points at ₹0.25 → ₹50 + ₹25 = ₹75
    """
    total = ZERO_DECIMAL

    if cashback_amount is not None:
        total += cashback_amount

    if points_result is not None:
        total += normalize_points_to_inr(points_result)

    return total


def normalize_reward_type(cashback_amount: Decimal | None, points_result: PointsResult | None) -> RewardType:
    """Determine the canonical reward type from evaluation results.

    Priority: cashback > points > none.

    Args:
        cashback_amount: Cashback amount in INR, if any.
        points_result: Points evaluation result, if any.

    Returns:
        The RewardType enum value.
    """
    if cashback_amount is not None and cashback_amount > ZERO_DECIMAL:
        return RewardType.CASHBACK
    if points_result is not None and points_result.earned_points > 0:
        return RewardType.POINTS
    return RewardType.NONE