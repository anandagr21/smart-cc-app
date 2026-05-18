"""
Module: backend.reward_engine.ranker
Responsibility: Ranks multiple cards based on effective reward value.

Architectural Boundaries:
- Pure function. Sorts pre-computed reward outputs descending by INR value.
- Handles tie-breaking (e.g., lower fee, alphabetical).

TODO:
- Implement rank_cards(list[RewardOutput]) -> list[RewardOutput]
"""
