"""
Module: backend.recommendations.exceptions
Responsibility: Domain exceptions for the recommendations module.
"""

from __future__ import annotations


class RecommendationError(Exception):
    """Base exception for recommendations orchestration."""


class NoCardsError(RecommendationError):
    """Raised when the user has no active cards to evaluate."""

    def __init__(self) -> None:
        super().__init__("User has no active cards to evaluate.")
