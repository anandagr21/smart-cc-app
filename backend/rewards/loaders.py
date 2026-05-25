"""
Module: backend.rewards.loaders
Responsibility: Load and prepare reward rule definitions for the reward engine.

Architectural Boundaries:
- Reads rule definitions from the repository layer.
- Normalizes rule_config JSONB via the normalizers module.
- Returns clean, predictable data structures for the engine.
- MUST NOT calculate rewards or depend on the reward engine.
- MUST NOT access the database directly — delegates to repository.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from rewards.normalizers import normalize_rule_config

if TYPE_CHECKING:
    from rewards.models import RewardRule


def load_rules_for_card(rules: list[RewardRule]) -> list[dict]:
    """Load and normalize all rules for a card.

    Each rule's `rule_config` JSONB is normalized via the normalizer
    to ensure the reward engine receives complete, predictable configs.

    Args:
        rules: List of RewardRule ORM models from the repository.

    Returns:
        A list of normalized rule dicts ready for engine consumption.
        Each dict contains: id, card_id, rule_name, rule_type, priority,
        is_active, and a fully-normalized rule_config.

    Example:
        >>> rules = await repo.get_rules_by_card(session, card_id="abc-123")
        >>> normalized = load_rules_for_card(rules)
        >>> normalized[0]["rule_config"]["reward_rate"]
        0.1
    """
    return [_normalize_single_rule(rule) for rule in rules]


def load_active_rules(rules: list[RewardRule]) -> list[dict]:
    """Load and normalize only active rules from a list.

    Convenience wrapper that filters to `is_active=True` before normalizing.
    Typically used when the engine needs only evaluable rules.

    Args:
        rules: List of RewardRule ORM models (may include inactive).

    Returns:
        A list of normalized active rule dicts sorted by priority (ascending).
    """
    active = [rule for rule in rules if rule.is_active]
    active.sort(key=lambda r: r.priority)
    return [_normalize_single_rule(rule) for rule in active]


def load_rules_by_merchant(rules: list[RewardRule], merchant: str) -> list[dict]:
    """Filter and normalize rules that match a specific merchant.

    A rule matches the merchant if its rule_config contains a "merchant" key
    whose value (case-insensitive) equals the given merchant.

    Args:
        rules: List of RewardRule ORM models.
        merchant: Canonical merchant name (e.g., "swiggy", "amazon").

    Returns:
        A list of normalized rule dicts applicable to this merchant,
        sorted by priority (ascending).
    """
    merchant_lower = merchant.lower()
    matched: list[RewardRule] = []
    for rule in rules:
        config_merchant = rule.rule_config.get("merchant") if rule.rule_config else None
        if config_merchant and str(config_merchant).lower() == merchant_lower:
            matched.append(rule)
    matched.sort(key=lambda r: r.priority)
    return [_normalize_single_rule(rule) for rule in matched]


def _normalize_single_rule(rule: RewardRule) -> dict:
    """Normalize a single RewardRule ORM model into a clean dict.

    Delegates rule_config normalization to the normalizers module.
    Uses the rule's rule_type string to determine the RewardRuleType enum.

    Args:
        rule: A single RewardRule ORM model instance.

    Returns:
        A normalized dict with all fields from the model plus a
        fully-normalized rule_config.
    """
    from rewards.constants import RewardRuleType

    rule_type_enum = RewardRuleType(rule.rule_type)
    normalized_config = normalize_rule_config(rule_type_enum, rule.rule_config)

    return {
        "id": str(rule.id),
        "card_id": rule.card_id,
        "rule_name": rule.rule_name,
        "rule_type": rule.rule_type,
        "priority": rule.priority,
        "is_active": rule.is_active,
        "rule_config": normalized_config,
        "created_at": rule.created_at,
        "updated_at": rule.updated_at,
    }