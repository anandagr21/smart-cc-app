"""
Module: backend.reward_engine.cap_utils
Responsibility: Pure utility functions for the deterministic caps engine.

Architectural Boundaries:
- Pure functions — no I/O, no side effects, no randomness.
- Complements utils.py with cap-specific calculations.
- MUST NOT depend on DB models, services, or routes.
"""

from __future__ import annotations

from decimal import Decimal

from reward_engine.constants import ZERO_DECIMAL
from reward_engine.utils import round_inr


def compute_headroom(cap_limit: Decimal, cumulative_earned: Decimal) -> Decimal:
    """Compute remaining headroom for a cap.

    headroom = max(0, cap_limit - cumulative_earned)

    Args:
        cap_limit: Maximum reward allowed by the cap.
        cumulative_earned: Total rewards already earned in the same scope/period.

    Returns:
        Remaining headroom, never negative.
    """
    if cap_limit <= ZERO_DECIMAL:
        return ZERO_DECIMAL
    headroom = cap_limit - cumulative_earned
    return max(ZERO_DECIMAL, headroom)


def clamp_reward(unbounded_reward: Decimal, headroom: Decimal) -> Decimal:
    """Clamp a reward value to fit within available headroom.

    capped = max(0, min(unbounded_reward, headroom))

    Args:
        unbounded_reward: The reward before cap application.
        headroom: The remaining cap headroom.

    Returns:
        Reward value clamped to [0, headroom], rounded to INR precision.
    """
    if unbounded_reward <= ZERO_DECIMAL:
        return ZERO_DECIMAL
    if headroom <= ZERO_DECIMAL:
        return ZERO_DECIMAL
    return round_inr(min(unbounded_reward, headroom))


def compute_cap_reduction(original: Decimal, adjusted: Decimal) -> Decimal:
    """Compute how much a reward was reduced by cap application.

    reduction = max(0, original - adjusted)

    Args:
        original: Reward value before cap.
        adjusted: Reward value after cap.

    Returns:
        Non-negative reduction amount, rounded to INR precision.
    """
    raw = original - adjusted
    if raw <= ZERO_DECIMAL:
        return ZERO_DECIMAL
    return round_inr(raw)


def is_cap_exhausted(headroom: Decimal) -> bool:
    """Check if a cap is fully exhausted (headroom ≤ 0).

    Args:
        headroom: Remaining cap headroom.

    Returns:
        True if headroom is zero or negative (exhausted).
    """
    return headroom <= ZERO_DECIMAL


def is_near_exhaustion(headroom: Decimal, cap_limit: Decimal, threshold_pct: Decimal = Decimal("0.10")) -> bool:
    """Check if a cap is near exhaustion.

    Near exhaustion means headroom is less than threshold_pct of the cap limit.

    Args:
        headroom: Remaining cap headroom.
        cap_limit: Original cap limit.
        threshold_pct: Percentage threshold as decimal (default 0.10 = 10%).

    Returns:
        True if headroom / cap_limit < threshold_pct.
    """
    if cap_limit <= ZERO_DECIMAL:
        return False
    return (headroom / cap_limit) <= threshold_pct


def build_cap_key(cap_type: str, scope: str, merchant: str | None = None, category: str | None = None) -> str:
    """Build a unique string key for tracking cap headroom state.

    Used as a key in the remaining_headrooms dict on CapEvaluationResult.

    Format:
        - no merchant, no category:  "{cap_type}::{scope}::"
        - merchant only:             "{cap_type}::{scope}::{merchant}::"
        - category only:             "{cap_type}::{scope}::{category}"
        - both:                      "{cap_type}::{scope}::{merchant}::{category}"

    Args:
        cap_type: Cap type string (e.g., 'monthly_cap').
        scope: Cap scope string (e.g., 'monthly').
        merchant: Optional merchant name for merchant-specific caps.
        category: Optional category name for category-specific caps.

    Returns:
        A unique key string.
    """
    merchant_part = merchant.lower().strip() if merchant else ""
    category_part = category.lower().strip() if category else ""

    if merchant_part and category_part:
        return f"{cap_type}::{scope}::{merchant_part}::{category_part}"
    elif merchant_part:
        return f"{cap_type}::{scope}::{merchant_part}::"
    elif category_part:
        return f"{cap_type}::{scope}::{category_part}"
    else:
        return f"{cap_type}::{scope}::"


def should_apply_cap(cap_limit: Decimal) -> bool:
    """Check if a cap should be applied (has a meaningful limit).

    Args:
        cap_limit: The cap limit value.

    Returns:
        True if cap_limit > 0.
    """
    return cap_limit > ZERO_DECIMAL


def sum_reductions(details: list) -> Decimal:
    """Sum all individual cap reductions into a total.

    Args:
        details: List of CapApplicationDetail objects.

    Returns:
        Total reduction across all applied caps, rounded to INR precision.
    """
    total = sum((d.reduction for d in details), ZERO_DECIMAL)
    return round_inr(total)