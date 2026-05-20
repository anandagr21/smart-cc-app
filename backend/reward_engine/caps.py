"""
Module: backend.reward_engine.caps
Responsibility: Enforces reward limits (per-transaction, monthly, category, annual).

Architectural Boundaries:
- Pure function. Compares cumulative rewards + new reward against cap limits.
- Returns capped reward value and applied cap details.
- No DB access, no I/O, no side effects.

Cap evaluation:
  capped_reward = max(0, min(uncapped_reward, cap_limit - cumulative_spend))
  where cumulative_spend is the total rewards already earned in the same scope/period.
"""

from __future__ import annotations

from decimal import Decimal

from reward_engine.constants import ZERO_DECIMAL, CapScope
from reward_engine.schemas import CapResult

# Keys checked (in order) for cap values in rule config dicts.
_CAP_KEY_CANDIDATES = ("cap", "monthly_cap", "annual_cap", "per_transaction_cap")


def apply_cap(
    uncapped_reward: Decimal,
    cumulative_spend: Decimal,
    cap_limit: Decimal,
    scope: CapScope = CapScope.PER_TRANSACTION,
) -> CapResult:
    """Apply a reward cap based on the remaining headroom.

    The capped reward is computed as:
        headroom = cap_limit - cumulative_spend
        capped = max(0, min(uncapped_reward, headroom))

    A cap is considered "applied" only if the uncapped reward exceeds headroom.

    Args:
        uncapped_reward: The reward value before capping.
        cumulative_spend: Total rewards already earned in the same scope/period.
        cap_limit: The maximum reward allowed in this scope.
        scope: The scope of the cap (per_transaction, monthly, category, annual).

    Returns:
        CapResult with was_capped, capped_reward, and audit details.

    Example:
        uncapped=₹150, cumulative=₹400, cap_limit=₹500
        → headroom=₹100, capped=₹100 (was_capped=True)

        uncapped=₹50, cumulative=₹0, cap_limit=₹0 (no cap)
        → capped=₹50 (was_capped=False)
    """
    if cap_limit <= ZERO_DECIMAL:
        return CapResult(
            was_capped=False,
            cap_scope=scope,
            cap_limit=cap_limit,
            uncapped_reward=uncapped_reward,
            capped_reward=uncapped_reward,
        )

    headroom = cap_limit - cumulative_spend
    if headroom <= ZERO_DECIMAL:
        return CapResult(
            was_capped=True,
            cap_scope=scope,
            cap_limit=cap_limit,
            uncapped_reward=uncapped_reward,
            capped_reward=ZERO_DECIMAL,
        )

    capped = min(uncapped_reward, headroom)
    return CapResult(
        was_capped=capped < uncapped_reward,
        cap_scope=scope,
        cap_limit=cap_limit,
        uncapped_reward=uncapped_reward,
        capped_reward=capped,
    )


def apply_caps_from_config(
    uncapped_reward: Decimal,
    cumulative_spend: Decimal,
    config: dict[str, object],
) -> CapResult:
    """Apply caps based on rule config values.

    Checks for a cap value using these keys (in order):
      - "cap"
      - "monthly_cap"
      - "annual_cap"
      - "per_transaction_cap"

    The first non-null value found is used as the cap limit.
    The scope is inferred from the key name (e.g., "monthly_cap" → MONTHLY).

    If no cap is specified in config, returns uncapped result.

    Args:
        uncapped_reward: The reward value before capping.
        cumulative_spend: Total rewards already earned in the same scope/period.
        config: The matched rule's config dict.

    Returns:
        CapResult with was_capped and capped_reward.
    """
    cap_limit = ZERO_DECIMAL
    scope = CapScope.PER_TRANSACTION

    for key in _CAP_KEY_CANDIDATES:
        raw = config.get(key)
        if raw is not None:
            cap_limit = _to_decimal(raw)
            scope = _scope_from_key(key)
            break

    return apply_cap(
        uncapped_reward=uncapped_reward,
        cumulative_spend=cumulative_spend,
        cap_limit=cap_limit,
        scope=scope,
    )


def _scope_from_key(key: str) -> CapScope:
    """Infer CapScope from the config key name."""
    scope_map = {
        "cap": CapScope.PER_TRANSACTION,
        "monthly_cap": CapScope.MONTHLY,
        "annual_cap": CapScope.ANNUAL,
        "per_transaction_cap": CapScope.PER_TRANSACTION,
    }
    return scope_map.get(key, CapScope.PER_TRANSACTION)


def _to_decimal(value: object) -> Decimal:
    """Convert a numeric value to Decimal, returning ZERO_DECIMAL on failure."""
    if value is None:
        return ZERO_DECIMAL
    try:
        return Decimal(str(value))
    except Exception:
        return ZERO_DECIMAL