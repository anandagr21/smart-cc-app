"""
Module: backend.reward_engine.calculator
Responsibility: Main entry point for deterministic evaluation of credit card rewards.

Architectural Boundaries:
- THIS IS THE SINGLE SOURCE OF TRUTH for financial calculations.
- Pure functions preferred: no side effects, no randomness.
- MUST NOT access the database (I/O).
- MUST NOT call AI logic.
- Takes structured config + transaction data and returns precise INR values.

TODO:
- Implement calculate_effective_reward(card_config, transaction_context) -> RewardOutput
- Integrate with cashback, points, multipliers, exclusions, and caps modules.
"""
