"""
Module: backend.reward_engine.merchant_matcher
Responsibility: Matches a transaction to a specific reward tier.

Architectural Boundaries:
- Pure function.
- Priorities: 1. Exact merchant match, 2. MCC match, 3. Category match, 4. Default rate.

TODO:
- Implement match_merchant(merchant_name, mcc, card_config) -> RewardTier
"""
