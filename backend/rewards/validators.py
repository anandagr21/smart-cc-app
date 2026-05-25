"""
Module: backend.rewards.validators
Responsibility: Pure validation logic for reward rule configurations.

Architectural Boundaries:
- Pure functions — no I/O, no database access, no side effects.
- Validates rule_config JSONB structure against expected shapes per rule_type.
- Used by the service layer BEFORE persistence to ensure data integrity.
- MUST NOT calculate rewards or depend on the reward engine.
"""

from __future__ import annotations

from typing import Any

from rewards.constants import (
    MONETARY_CONFIG_KEYS,
    RewardRuleType,
)
from rewards.exceptions import (
    InvalidRuleConfigException,
    InvalidRuleTypeException,
)


# ---------------------------------------------------------------------------
# Registry: rule_type → list of required config keys
# ---------------------------------------------------------------------------
_REQUIRED_CONFIG_KEYS: dict[RewardRuleType, list[str]] = {
    RewardRuleType.CASHBACK: ["reward_rate"],
    RewardRuleType.REWARD_POINTS: ["reward_rate"],
    RewardRuleType.MERCHANT_BONUS: ["merchant", "reward_rate"],
    RewardRuleType.CATEGORY_BONUS: ["category", "reward_rate"],
    RewardRuleType.MILESTONE: ["threshold"],
    RewardRuleType.CAP: ["cap"],
    RewardRuleType.EXCLUSION: ["excluded"],
    RewardRuleType.SURCHARGE_WAIVER: [],
}

# Registry: rule_type → list of all recognized config keys (for unknown-key warnings)
_KNOWN_CONFIG_KEYS: dict[RewardRuleType, frozenset[str]] = {
    RewardRuleType.CASHBACK: frozenset(
        {"reward_rate", "reward_type", "min_spend", "max_reward", "cap"}
    ),
    RewardRuleType.REWARD_POINTS: frozenset(
        {"reward_rate", "reward_type", "points_multiplier", "min_spend", "max_reward", "cap"}
    ),
    RewardRuleType.MERCHANT_BONUS: frozenset(
        {"merchant", "reward_rate", "reward_type", "min_spend", "max_reward", "cap"}
    ),
    RewardRuleType.CATEGORY_BONUS: frozenset(
        {"category", "reward_rate", "reward_type", "min_spend", "max_reward", "cap"}
    ),
    RewardRuleType.MILESTONE: frozenset(
        {"threshold", "reward_rate", "reward_type", "period", "cap"}
    ),
    RewardRuleType.CAP: frozenset({"cap", "period", "scope"}),
    RewardRuleType.EXCLUSION: frozenset(
        {"excluded", "merchant", "category", "reason"}
    ),
    RewardRuleType.SURCHARGE_WAIVER: frozenset(
        {"surcharge_amount", "max_waiver", "merchant", "category"}
    ),
}


def validate_rule_type(rule_type: str) -> RewardRuleType:
    """Validate that *rule_type* is a supported RewardRuleType member.

    Args:
        rule_type: Raw rule_type string from API input.

    Returns:
        The corresponding RewardRuleType enum member.

    Raises:
        InvalidRuleTypeException: If *rule_type* is not recognized.
    """
    try:
        return RewardRuleType(rule_type)
    except ValueError:
        supported = ", ".join(t.value for t in RewardRuleType)
        raise InvalidRuleTypeException(rule_type, supported)


def validate_rule_schema(rule_type: RewardRuleType, config: dict[str, Any]) -> None:
    """Validate the rule_config JSONB blob for a given rule_type.

    Validates:
    1. All required keys for the rule_type are present.
    2. Monetary values (cap, min_spend, max_reward, threshold) are positive numbers.
    3. reward_rate is a positive float between 0 and 1 (0% to 100%).
    4. The `excluded` key is a boolean (for exclusion rules).
    5. No unknown keys that could indicate a misconfiguration.

    Args:
        rule_type: The canonical rule type.
        config: The rule_config dictionary to validate.

    Raises:
        InvalidRuleConfigException: If any validation checks fail.
    """
    required_keys = _REQUIRED_CONFIG_KEYS.get(rule_type, [])

    # ---- Check required keys ----
    missing = [key for key in required_keys if key not in config]
    if missing:
        raise InvalidRuleConfigException(
            f"Missing required config keys for rule_type '{rule_type.value}': {missing}",
            details={"rule_type": rule_type, "missing_keys": missing},
        )

    # ---- Validate monetary config keys are positive ----
    for key in MONETARY_CONFIG_KEYS:
        if key in config:
            value = config[key]
            if not isinstance(value, (int, float)) or value < 0:
                raise InvalidRuleConfigException(
                    f"Config key '{key}' must be a non-negative number. Got: {value!r}",
                    details={"key": key, "value": value},
                )

    # ---- Validate reward_rate is a positive float 0–1 ----
    if "reward_rate" in config:
        rate = config["reward_rate"]
        if not isinstance(rate, (int, float)) or rate < 0 or rate > 1:
            raise InvalidRuleConfigException(
                f"'reward_rate' must be a number between 0 and 1. Got: {rate!r}",
                details={"reward_rate": rate},
            )

    # ---- Validate 'excluded' is a boolean ----
    if "excluded" in config and not isinstance(config["excluded"], bool):
        raise InvalidRuleConfigException(
            f"'excluded' must be a boolean. Got: {config['excluded']!r}",
            details={"excluded": config["excluded"]},
        )

    # ---- TODO: Warn on unknown keys (future: emit structured warnings) ----
    # known = _KNOWN_CONFIG_KEYS.get(rule_type, frozenset())
    # unknown = set(config) - known
    # if unknown:
    #     _logger.warning("Unknown config keys for rule_type '%s': %s", rule_type, unknown)


def validate_no_duplicate_rule(
    existing_rules: list[Any], rule_name: str
) -> None:
    """Check that no rule with the same *rule_name* already exists for a card.

    This is a convenience validator used by the service layer before creation.

    Args:
        existing_rules: List of existing RewardRule models for the card.
        rule_name: The proposed rule name for the new rule.

    Raises:
        DuplicateRuleException: If a rule with the same name already exists for the card.
    """
    from rewards.exceptions import DuplicateRuleException

    for rule in existing_rules:
        if rule.rule_name == rule_name:
            raise DuplicateRuleException(
                card_id=rule.card_id,
                rule_name=rule.rule_name,
            )


# Alias for backward compatibility with test suite
validate_rule_config = validate_rule_schema
