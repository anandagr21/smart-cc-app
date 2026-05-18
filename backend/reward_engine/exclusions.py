"""
Module: backend.reward_engine.exclusions
Responsibility: Evaluates whether a transaction is excluded from earning rewards.

Architectural Boundaries:
- Pure function. Checks merchant name and MCC against card exclusion lists.

TODO:
- Implement is_excluded(transaction_context, card_config) -> bool
"""
