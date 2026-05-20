"""
Module: backend.rewards.normalizers
Responsibility: Pure normalization utilities for reward rule configurations.

Architectural Boundaries:
- Pure functions — no I/O, no database access, no side effects.
- Transforms raw rule_config dicts into normalized, predictable shapes.
- Ensures consistent typing and defaults before rules enter the engine.
- MUST NOT calculate rewards or depend on the reward engine.
"""

from __future__ import annotations

from typing import Any

from rewards.constants import RewardRuleType


# ---------------------------------------------------------------------------
# Default fillers per rule_type — applied when keys are absent from config.
# ---------------------------------------------------------------------------
_DEFAULT_VALUES: dict[RewardRuleType, dict[str, Any]] = {
    RewardRuleType.CASHBACK: {
        "reward_type": "cashback",
        "min_spend": 0,
        "max_reward": 0,
        "cap": 0,
    },
    RewardRuleType.REWARD_POINTS: {
        "reward_type": "points",
        "points_multiplier": 1,
        "min_spend": 0,
        "max_reward": 0,
        "cap": 0,
    },
    RewardRuleType.MERCHANT_BONUS: {
        "reward_type": "cashback",
        "min_spend": 0,
        "max_reward": 0,
        "cap": 0,
    },
    RewardRuleType.CATEGORY_BONUS: {
        "reward_type": "cashback",
        "min_spend": 0,
        "max_reward": 0,
        "cap": 0,
    },
    RewardRuleType.MILESTONE: {
        "reward_type": "cashback",
        "reward_rate": 0.0,
        "period": "monthly",
        "cap": 0,
    },
    RewardRuleType.CAP: {
        "period": "monthly",
        "scope": "total",
    },
    RewardRuleType.EXCLUSION: {
        "reason": "unspecified",
    },
    RewardRuleType.SURCHARGE_WAIVER: {
        "max_waiver": 0,
    },
}


def normalize_rule_config(rule_type: RewardRuleType, config: dict[str, Any]) -> dict[str, Any]:
    """Normalize a raw rule_config by filling in defaults and standardizing values.

    This ensures that the rule engine always receives a complete, predictable
    configuration shape regardless of what keys the client provided.

    Normalization steps:
    1. Start with default values for the rule_type.
    2. Overlay the provided config (client values take precedence).
    3. Ensure reward_rate is a float (not int).
    4. Strip any extraneous None values.

    Args:
        rule_type: The canonical rule type.
        config: The raw configuration dict from client input.

    Returns:
        A fully-normalized configuration dict with all defaults applied.

    Example:
        >>> normalize_rule_config(
        ...     RewardRuleType.MERCHANT_BONUS,
        ...     {"merchant": "swiggy", "reward_rate": 0.10, "cap": 1500},
        ... )
        {
            "merchant": "swiggy",
            "reward_rate": 0.10,
            "reward_type": "cashback",
            "min_spend": 0,
            "max_reward": 0,
            "cap": 1500,
        }
    """
    defaults: dict[str, Any] = _DEFAULT_VALUES.get(rule_type, {}).copy()
    normalized: dict[str, Any] = {**defaults, **config}

    # Coerce reward_rate to float if present.
    if "reward_rate" in normalized and normalized["reward_rate"] is not None:
        normalized["reward_rate"] = float(normalized["reward_rate"])

    # Strip None values to keep configs clean.
    normalized = {k: v for k, v in normalized.items() if v is not None}

    return normalized


def normalize_rule_name(raw_name: str) -> str:
    """Normalize a rule name for consistent storage and comparison.

    Applies:
    - Strip leading/trailing whitespace.
    - Collapse multiple consecutive spaces.

    Args:
        raw_name: Raw rule name string.

    Returns:
        Cleaned rule name.
    """
    import re

    return re.sub(r"\s+", " ", raw_name.strip())


def normalize_rule_priority(priority: int | None) -> int:
    """Coerce rule priority to a safe integer.

    Args:
        priority: Raw priority value (may be None).

    Returns:
        An integer between 0 and 1000 inclusive.
    """
    if priority is None:
        return 0
    return max(0, min(int(priority), 1000))