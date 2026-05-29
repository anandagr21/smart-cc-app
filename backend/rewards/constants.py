"""
Module: backend.rewards.constants
Responsibility: Enums and constants for reward rule types and classifications.

Architectural Boundaries:
- Pure data definitions — no I/O, no business logic.
- Defines the canonical set of supported rule types.
- Used by validators, schemas, and the reward engine for type-safe rule classification.
"""

from enum import StrEnum


class RewardRuleType(StrEnum):
    """Canonical reward rule types supported by the platform.

    Each rule type represents a distinct category of reward logic that can be
    applied to a credit card. The evaluator (reward engine) uses these types
    to determine which computation path to follow.

    Adding a new rule type:
        1. Add the enum member here.
        2. Add validation logic in validators.py.
        3. Update the evaluator in reward_engine/ to handle the new type.
    """

    CASHBACK = "cashback"
    """Flat or tiered percentage-based cashback on transactions."""

    REWARD_POINTS = "reward_points"
    """Points-based rewards with configurable redemption rates."""

    MERCHANT_BONUS = "merchant_bonus"
    """Bonus rewards for specific merchants (e.g., Swiggy 10%)."""

    CATEGORY_BONUS = "category_bonus"
    """Bonus rewards for transaction categories (e.g., online 5%)."""

    MILESTONE = "milestone"
    """Milestone-based rewards triggered by cumulative spend thresholds."""

    CAP = "cap"
    """Reward caps limiting maximum earnings per period or category."""

    EXCLUSION = "exclusion"
    """Exclusion rules that zero out rewards for specific conditions."""

    SURCHARGE_WAIVER = "surcharge_waiver"
    """Fuel surcharge waiver rules."""

    BENEFIT = "benefit"
    """General card benefits and perks."""

    GENERIC_REWARD = "generic_reward"
    """Generic reward rules that don't fit other categories."""


# Set of rule types that represent "bonus" (earn more) rather than "restriction" logic.
BONUS_RULE_TYPES: frozenset[RewardRuleType] = frozenset({
    RewardRuleType.CASHBACK,
    RewardRuleType.REWARD_POINTS,
    RewardRuleType.MERCHANT_BONUS,
    RewardRuleType.CATEGORY_BONUS,
    RewardRuleType.MILESTONE,
    RewardRuleType.SURCHARGE_WAIVER,
    RewardRuleType.BENEFIT,
    RewardRuleType.GENERIC_REWARD,
})

# Set of rule types that represent "restriction" logic (caps, exclusions).
RESTRICTION_RULE_TYPES: frozenset[RewardRuleType] = frozenset({
    RewardRuleType.CAP,
    RewardRuleType.EXCLUSION,
})

# All config keys that represent a monetary value and must be validated as positive decimals.
MONETARY_CONFIG_KEYS: frozenset[str] = frozenset({
    "cap",
    "min_spend",
    "max_reward",
    "threshold",
    "surcharge_amount",
})