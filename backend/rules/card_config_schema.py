"""
Module: backend.rules.card_config_schema
Responsibility: Defines the schema for card reward configurations (JSONB structure).

Architectural Boundaries:
- Defines the structure that the Reward Engine expects.
- Pure Pydantic definitions for rates, caps, exclusions, and milestones.
- Enables extensibility without changing engine code.

TODO:
- Define CardConfig, RewardTier, CapRule, ExclusionRule schemas.
"""
