"""
Module: backend.reward_engine.cap_matcher
Responsibility: Match cap rules to transactions based on merchant, category, and scope.

Architectural Boundaries:
- Pure matching functions — no I/O, no side effects, no state.
- Determines which cap rules apply to a given transaction.
- MUST NOT import from DB layer, services, or routes.
- MUST NOT perform arithmetic or reward calculations — those belong in caps.py.
"""

from __future__ import annotations

from datetime import date

from decimal import Decimal

from reward_engine.cap_schemas import CapRule
from reward_engine.constants import (
    CAP_TYPE_ANNUAL,
    CAP_TYPE_CATEGORY,
    CAP_TYPE_MERCHANT,
    CAP_TYPE_MONTHLY,
    CAP_TYPE_TRANSACTION,
    CapScope,
)
from reward_engine.utils import normalize_merchant


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def match_caps(
    cap_rules: list[CapRule],
    merchant: str,
    category: str,
    transaction_date: date | None = None,
) -> list[CapRule]:
    """Match a list of cap rules to a given transaction context.

    Applies the following matching logic:
    - transaction_cap: always matches (scoped at the transaction level).
    - monthly_cap: always matches (scope handles the period).
    - category_cap: matches if cap.category == transaction category (case-insensitive).
    - merchant_cap: matches if cap.merchant == transaction merchant (normalized).

    Args:
        cap_rules: All potential cap rules to evaluate against.
        merchant: Merchant name from the transaction.
        category: Purchase category from the transaction.
        transaction_date: Optional transaction date (reserved for future date-based matching).

    Returns:
        Sorted list of matching CapRule objects (sorted by priority, then cap_type).
    """
    matching: list[CapRule] = []

    for rule in cap_rules:
        if _rule_applies(rule, merchant, category, transaction_date):
            matching.append(rule)

    return sorted(matching, key=lambda r: (r.priority, r.cap_type))


def filter_caps_by_scope(
    cap_rules: list[CapRule],
    scope: CapScope,
) -> list[CapRule]:
    """Filter cap rules to only those with a specific scope.

    Args:
        cap_rules: List of CapRule objects.
        scope: Target CapScope to filter by.

    Returns:
        List of CapRule objects matching the given scope.
    """
    return [r for r in cap_rules if r.scope == scope]


def filter_caps_by_type(
    cap_rules: list[CapRule],
    cap_type: str,
) -> list[CapRule]:
    """Filter cap rules to only those of a specific type.

    Args:
        cap_rules: List of CapRule objects.
        cap_type: Cap type string to filter by.

    Returns:
        List of CapRule objects matching the given type.
    """
    return [r for r in cap_rules if r.cap_type == cap_type]


def has_exhausted_caps(
    cap_rules: list[CapRule],
    headrooms: dict[str, Decimal],
) -> bool:
    """Check if all applicable caps are exhausted.

    Uses headrooms dict (keyed by cap_key) to determine if any cap still has headroom.

    Args:
        cap_rules: List of CapRule objects to check.
        headrooms: Dict mapping cap keys to remaining headroom values.

    Returns:
        True if ALL caps have headroom ≤ 0 (all exhausted).
    """
    if not cap_rules:
        return False
    for rule in cap_rules:
        key = _cap_key(rule)
        headroom = headrooms.get(key)
        if headroom is not None:
            try:
                if float(str(headroom)) > 0:
                    return False  # At least one cap has headroom
            except (ValueError, TypeError):
                pass
    return True


def select_most_restrictive_cap(
    cap_rules: list[CapRule],
    headrooms: dict[str, Decimal],
) -> CapRule | None:
    """Select the cap with the smallest remaining headroom.

    Among matched caps, return the one that will restrict the reward the most.
    If all heads are equal, prefers higher priority cap types.

    Args:
        cap_rules: Matched cap rules.
        headrooms: Dict mapping cap keys to headroom values.

    Returns:
        The most restrictive CapRule, or None if no caps match.
    """
    if not cap_rules:
        return None

    most_restrictive = cap_rules[0]
    min_headroom = _headroom_value(headrooms, _cap_key(most_restrictive))

    for rule in cap_rules[1:]:
        current_headroom = _headroom_value(headrooms, _cap_key(rule))
        if current_headroom < min_headroom:
            most_restrictive = rule
            min_headroom = current_headroom

    return most_restrictive


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _rule_applies(
    rule: CapRule,
    merchant: str,
    category: str,
    transaction_date: date | None,
) -> bool:
    """Check if a single cap rule applies to the given transaction context.

    Returns True if the rule should be evaluated against this transaction.
    """
    if not _has_meaningful_limit(rule):
        return False

    # Transaction caps always apply (scope is per-transaction)
    if rule.cap_type == CAP_TYPE_TRANSACTION:
        return True

    # Monthly caps always apply (scope is monthly)
    if rule.cap_type == CAP_TYPE_MONTHLY:
        return True

    # Annual caps always apply (scope is annual)
    if rule.cap_type == CAP_TYPE_ANNUAL:
        return True

    # Category caps: match on category (case-insensitive)
    if rule.cap_type == CAP_TYPE_CATEGORY:
        if rule.category is None or category is None:
            return False
        return rule.category.strip().lower() == category.strip().lower()

    # Merchant caps: match on merchant (normalized comparison)
    if rule.cap_type == CAP_TYPE_MERCHANT:
        if rule.merchant is None or merchant is None:
            return False
        return normalize_merchant(rule.merchant) == normalize_merchant(merchant)

    # Unknown cap types: do not apply (safety default)
    return False


def _has_meaningful_limit(rule: CapRule) -> bool:
    """Check if a cap rule has a meaningful limit (> 0)."""
    from reward_engine.constants import ZERO_DECIMAL

    return rule.limit > ZERO_DECIMAL


def _cap_key(rule: CapRule) -> str:
    """Generate a unique key string for a cap rule."""
    from reward_engine.cap_utils import build_cap_key

    scope_str = rule.scope.value if hasattr(rule.scope, "value") else str(rule.scope)
    return build_cap_key(
        cap_type=rule.cap_type,
        scope=scope_str,
        merchant=rule.merchant,
        category=rule.category,
    )


def _headroom_value(headrooms: dict[str, Decimal], key: str) -> float:
    """Safely extract a headroom float value from the headrooms dict."""
    from decimal import Decimal

    value = headrooms.get(key, Decimal("999999"))
    try:
        return float(str(value))
    except (ValueError, TypeError):
        return 999999.0