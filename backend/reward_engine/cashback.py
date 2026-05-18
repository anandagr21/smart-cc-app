"""
Module: backend.reward_engine.cashback
Responsibility: Deterministic calculation of cashback rewards.

Architectural Boundaries:
- Pure function. Takes base rate and transaction amount, returns exact INR value.
- No DB access, no AI logic.

TODO:
- Implement compute_cashback(rate, amount)
"""
