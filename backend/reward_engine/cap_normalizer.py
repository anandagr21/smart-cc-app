"""
Module: backend.reward_engine.cap_normalizer
Responsibility: Normalize raw cap configuration dicts into structured CapRule objects.

Architectural Boundaries:
- Pure transformation functions — no I/O, no side effects.
- Converts variegated config inputs into a uniform list of CapRule objects.
- MUST NOT import from DB layer, services, or routes.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from reward_engine.cap_exceptions import CapInvalidConfigError, InvalidCapScopeError, InvalidCapTypeError
from reward_engine.cap_schemas import CapConfigInput, CapRule
from reward_engine.constants import (
    CAP_SCOPE_MAP,
    CAP_TYPE_ANNUAL,
    CAP_TYPE_CATEGORY,
    CAP_TYPE_MERCHANT,
    CAP_TYPE_MONTHLY,
    CAP_TYPE_TRANSACTION,
    ZERO_DECIMAL,
    CapScope,
)
from reward_engine.utils import to_decimal


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def normalize_cap_config(config: dict[str, Any] | list[dict[str, Any]]) -> list[CapRule] | CapRule:
    """Normalize a raw rule config dict or list into CapRule objects.

    Supports four input shapes:
    1. A list of cap dicts directly:
       [{"type": "monthly_cap", "limit": 1500, "scope": "monthly"}]

    2. An explicit "caps" list inside a dict (multi-cap support):
       {"caps": [{"type": "monthly_cap", "limit": 1500},
                 {"type": "category_cap", "category": "fuel", "limit": 500}]}

    3. Legacy single-cap fields embedded in a config dict:
       {"cap": 500, ...} → [transaction_cap limit=500]
       {"monthly_cap": 1500, ...} → [monthly_cap limit=1500]

    4. A single cap entry dict (has "limit" or "cap_type"):
       {"cap_type": "monthly_cap", "limit": 1500, "scope": "monthly", "priority": 5}
       Returns a single CapRule (not wrapped in a list).

    Args:
        config: Raw rule configuration dict or list of cap dicts.

    Returns:
        A single CapRule for single-cap dict input, or a sorted list of CapRule
        objects (sorted by priority, then cap_type) for list/multi-cap input.

    Raises:
        InvalidCapTypeError: If a cap type string is unrecognized.
        InvalidCapScopeError: If a scope string is unrecognized.
        CapInvalidConfigError: If config is empty, limit is missing/invalid, or
            limit is not a valid number.
    """
    # Path 1: Direct list input — parse each entry
    if isinstance(config, list):
        rules = [_parse_cap_entry(entry) for entry in config]
        return sorted(rules, key=lambda r: (r.priority, r.cap_type))

    # Path 2: Explicit caps list inside a dict (multi-cap support)
    caps_raw = config.get("caps")
    if caps_raw and isinstance(caps_raw, list):
        rules = [_parse_cap_entry(entry) for entry in caps_raw]
        return sorted(rules, key=lambda r: (r.priority, r.cap_type))

    # Path 3: Legacy single-cap fields embedded in config dict
    rules = _extract_legacy_caps(config)
    if rules:
        if len(rules) == 1:
            return rules[0]
        return sorted(rules, key=lambda r: (r.priority, r.cap_type))

    # Path 4: Single cap entry dict (has limit or cap_type key)
    if _is_cap_entry_dict(config):
        _validate_cap_entry(config)
        return _parse_cap_entry(config)

    # Nothing matched — raise for invalid config
    raise CapInvalidConfigError(reason="empty or invalid cap configuration")


def cap_input_to_rule(input_data: CapConfigInput) -> CapRule:
    """Convert a CapConfigInput to a validated CapRule.

    Args:
        input_data: Cap configuration input from Pydantic model.

    Returns:
        A validated CapRule.

    Raises:
        InvalidCapTypeError: If cap_type is unrecognized.
        InvalidCapScopeError: If scope is unrecognized.
    """
    return _parse_cap_entry(input_data.model_dump())


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Mapping of legacy config keys to (cap_type, default_scope)
_LEGACY_KEY_MAP: dict[str, tuple[str, CapScope]] = {
    "cap": (CAP_TYPE_TRANSACTION, CapScope.PER_TRANSACTION),
    "transaction_cap": (CAP_TYPE_TRANSACTION, CapScope.PER_TRANSACTION),
    "per_transaction_cap": (CAP_TYPE_TRANSACTION, CapScope.PER_TRANSACTION),
    "monthly_cap": (CAP_TYPE_MONTHLY, CapScope.MONTHLY),
    "annual_cap": (CAP_TYPE_ANNUAL, CapScope.ANNUAL),
    "category_cap": (CAP_TYPE_CATEGORY, CapScope.CATEGORY),
    "merchant_cap": (CAP_TYPE_MERCHANT, CapScope.MERCHANT),
}

_VALID_CAP_TYPES = frozenset(
    {CAP_TYPE_TRANSACTION, CAP_TYPE_MONTHLY, CAP_TYPE_CATEGORY, CAP_TYPE_MERCHANT, CAP_TYPE_ANNUAL}
)


def _extract_legacy_caps(config: dict[str, Any]) -> list[CapRule]:
    """Extract cap rules from legacy flat-key configs."""
    rules: list[CapRule] = []
    for key, (cap_type, default_scope) in _LEGACY_KEY_MAP.items():
        raw = config.get(key)
        if raw is not None:
            limit = _safe_decimal(raw)
            if limit <= ZERO_DECIMAL:
                continue
            rules.append(
                CapRule(
                    cap_type=cap_type,
                    limit=limit,
                    scope=default_scope,
                    priority=0,
                )
            )
    return rules


def _parse_cap_entry(entry: dict[str, Any]) -> CapRule:
    """Parse a single cap entry dict (from the 'caps' list or CapConfigInput)."""
    cap_type = str(entry.get("type", entry.get("cap_type", CAP_TYPE_TRANSACTION)))
    _validate_cap_type(cap_type)

    limit = _safe_decimal(entry.get("limit", 0))

    scope_str = str(entry.get("scope", "per_transaction"))
    scope = _resolve_scope(scope_str)

    priority = int(entry.get("priority", 0))
    merchant = entry.get("merchant")
    category = entry.get("category")

    # Infer scope from cap_type unless an explicit, non-default scope was provided
    if scope_str == "per_transaction":
        scope = _infer_scope_from_type(cap_type)

    return CapRule(
        cap_type=cap_type,
        limit=limit,
        scope=scope,
        merchant=str(merchant) if merchant else None,
        category=str(category) if category else None,
        priority=max(0, min(priority, 1000)),
    )


def _resolve_scope(scope_str: str) -> CapScope:
    """Resolve a scope string to CapScope enum.

    Args:
        scope_str: Raw scope string from config.

    Returns:
        CapScope enum value.
        Defaults to CapScope.MONTHLY if scope string is unrecognized.
    """
    scope_str = scope_str.strip().lower()
    return CAP_SCOPE_MAP.get(scope_str, CapScope.MONTHLY)


def _infer_scope_from_type(cap_type: str) -> CapScope:
    """Infer the appropriate CapScope from a cap type string."""
    type_to_scope = {
        CAP_TYPE_MONTHLY: CapScope.MONTHLY,
        CAP_TYPE_ANNUAL: CapScope.ANNUAL,
        CAP_TYPE_CATEGORY: CapScope.CATEGORY,
        CAP_TYPE_MERCHANT: CapScope.MERCHANT,
        CAP_TYPE_TRANSACTION: CapScope.PER_TRANSACTION,
    }
    return type_to_scope.get(cap_type, CapScope.PER_TRANSACTION)


def _validate_cap_type(cap_type: str) -> None:
    """Validate that cap_type is one of the recognized types.

    Args:
        cap_type: Cap type string to validate.

    Raises:
        InvalidCapTypeError: If cap_type is not recognized.
    """
    if cap_type not in _VALID_CAP_TYPES:
        raise InvalidCapTypeError(cap_type)


def _is_cap_entry_dict(config: dict[str, Any]) -> bool:
    """Check if a dict represents a single cap entry.

    A cap entry dict has either:
    - "limit" key (with or without "cap_type"/"type")
    - "cap_type" or "type" key

    Args:
        config: Dictionary to check.

    Returns:
        True if this looks like a cap entry dict.
    """
    return bool(config.get("limit") is not None or config.get("cap_type") or config.get("type"))


def _validate_cap_entry(config: dict[str, Any]) -> None:
    """Validate that a cap entry dict has a valid limit.

    Args:
        config: Cap entry dict to validate.

    Raises:
        CapInvalidConfigError: If limit is missing, zero, negative, or not a valid number.
    """
    raw_limit = config.get("limit")
    if raw_limit is None:
        raise CapInvalidConfigError(reason="missing 'limit' key", key="limit", value="")

    limit = _safe_decimal(raw_limit)
    if limit <= ZERO_DECIMAL:
        raise CapInvalidConfigError(
            reason="limit must be positive", key="limit", value=str(raw_limit)
        )


def _safe_decimal(value: Any) -> Decimal:
    """Safely convert any value to Decimal, returning ZERO_DECIMAL on failure."""
    if value is None:
        return ZERO_DECIMAL
    try:
        return to_decimal(value)
    except (ValueError, TypeError, ArithmeticError):
        return ZERO_DECIMAL


# ---------------------------------------------------------------------------
# Aliases for backward compatibility with existing callers
# ---------------------------------------------------------------------------

# normalize_caps is an alias for normalize_cap_config (plural form matches the
# function name convention used by callers such as the test suite).
normalize_caps = normalize_cap_config
