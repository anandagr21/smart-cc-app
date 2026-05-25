"""
Module: backend.reward_engine.ranking_exceptions
Responsibility: Domain exceptions for the deterministic ranking engine.

Architectural Boundaries:
- Pure exception definitions — no I/O, no business logic.
- MUST NOT import from DB layer, services, or routes.
"""

from __future__ import annotations


class RankingError(Exception):
    """Base exception for all ranking engine errors."""


class EmptyEvaluationsError(RankingError):
    """Raised when rank_cards receives an empty evaluation list."""

    def __init__(self) -> None:
        super().__init__("Cannot rank an empty list of card evaluations.")


class DuplicateCardIdError(RankingError):
    """Raised when the same card_id appears more than once in the input."""

    def __init__(self, card_id: str) -> None:
        super().__init__(f"Duplicate card_id in evaluation inputs: '{card_id}'")
