"""
Module: backend.rewards
Responsibility: Reward rule schema infrastructure for storing and managing
reward logic definitions.

Architectural Boundaries:
- Defines how reward rules are represented, validated, loaded, and normalized.
- Does NOT calculate rewards — that's the Reward Engine's job.
- Does NOT rank cards or make recommendations.
- Does NOT involve AI or LangGraph.
- This module is purely about rule schema management (CRUD + validation + normalization).

Sub-modules:
- models.py: SQLModel entity definitions (RewardRule)
- schemas.py: Pydantic request/response schemas
- validators.py: Rule validation logic
- normalizers.py: Rule config normalization
- loaders.py: Rule loading queries
- repository.py: Database access layer
- service.py: Business orchestration layer
- routes.py: HTTP API endpoints
- constants.py: Enums and constants for rule types
- exceptions.py: Domain-specific exceptions
"""

from rewards.constants import RewardRuleType
from rewards.models import RewardRule
from rewards.schemas import (
    RewardRuleCreate,
    RewardRuleResponse,
    RewardRuleUpdate,
)

__all__ = [
    "RewardRule",
    "RewardRuleCreate",
    "RewardRuleResponse",
    "RewardRuleType",
    "RewardRuleUpdate",
]