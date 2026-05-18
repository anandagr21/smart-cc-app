"""
Module: backend.reward_engine.caps
Responsibility: Enforces reward limits (per-transaction, monthly, category, annual).

Architectural Boundaries:
- Pure function. Compares cumulative rewards + new reward against cap limits.
- Returns capped reward value and applied cap details.

TODO:
- Implement apply_cap(uncapped_reward, cumulative_reward, cap_limit) -> capped_reward
"""
