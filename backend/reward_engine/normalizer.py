"""
Module: backend.reward_engine.normalizer
Responsibility: Normalizes different reward types (points, cashback, miles) into a single INR effective value.

Architectural Boundaries:
- Pure function. Uses redemption rates declared in card config.
- Never infers or estimates values.

TODO:
- Implement normalize_to_inr(reward_value, reward_type, redemption_rate) -> Decimal
"""
