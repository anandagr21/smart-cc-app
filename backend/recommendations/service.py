"""
Module: backend.recommendations.service
Responsibility: Dependency injection facade for recommendation orchestrator.
"""

from __future__ import annotations

from uuid import UUID

from recommendations.orchestrator import RecommendationOrchestrator
from recommendations.schemas import RecommendationRequest, RecommendationResponse


class RecommendationService:
    """Service facade for the recommendation orchestrator."""

    def __init__(self, orchestrator: RecommendationOrchestrator) -> None:
        self._orchestrator = orchestrator

    async def evaluate(
        self, user_id: UUID, request: RecommendationRequest
    ) -> RecommendationResponse:
        """Evaluate a transaction and return ranked card recommendations."""
        return await self._orchestrator.generate_recommendation(user_id, request)
