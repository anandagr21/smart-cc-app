"""
Module: backend.recommendations.service
Responsibility: Dependency injection facade for recommendation orchestrator.
"""

from __future__ import annotations

from uuid import UUID

from recommendations.orchestrator import RecommendationOrchestrator
from recommendations.schemas import RecommendationRequest, RecommendationResponse


import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from models.recommendation_audit import RecommendationAudit

logger = logging.getLogger(__name__)

RULE_VERSION = "2026.06.07"

class RecommendationService:
    """Service facade for the recommendation orchestrator."""

    def __init__(self, orchestrator: RecommendationOrchestrator, session: AsyncSession) -> None:
        self._orchestrator = orchestrator
        self._session = session

    async def evaluate(
        self, user_id: UUID, request: RecommendationRequest
    ) -> RecommendationResponse:
        """Evaluate a transaction and return ranked card recommendations."""

        # 1. Generate unique calculation trace ID
        calculation_id = uuid.uuid4()

        # 2. Run the pure orchestrator logic
        response = await self._orchestrator.generate_recommendation(user_id, request, self._session)

        # 3. Attach calculation_id
        response.calculation_id = str(calculation_id)

        # 4. Save Forensic Audit to Database
        audit_record = RecommendationAudit(
            id=calculation_id,
            user_id=user_id,
            merchant_name=request.merchant_name,
            amount=float(request.amount),
            rule_version=RULE_VERSION,
            top_card_id=response.all_ranked_cards[0].card_id if response.all_ranked_cards else None,
            request_payload=request.model_dump(mode='json'),
            response_payload=response.model_dump(mode='json'),
        )
        self._session.add(audit_record)
        await self._session.commit()

        # 5. PII-Free Summary Logging
        logger.info(
            "Recommendation generated",
            extra={
                "calculation_id": str(calculation_id),
                "merchant": response.normalized_merchant,
                "amount": float(request.amount),
                "top_card": response.all_ranked_cards[0].card_name if response.all_ranked_cards else None,
                "reward": float(response.all_ranked_cards[0].immediate_reward_value) if response.all_ranked_cards else 0.0,
                "rule_version": RULE_VERSION
            }
        )

        return response

    async def evaluate_batch(
        self, user_id: UUID, requests: list[RecommendationRequest]
    ) -> list[RecommendationResponse]:
        """Evaluate multiple transactions in a single pass.

        Skips per-call audit logging, making this suitable for insight
        generation and analytics where audit trails are not required.
        """
        if not requests:
            return []

        # If orchestrator has batch support, use it
        if hasattr(self._orchestrator, 'generate_recommendations_batch'):
            responses = await self._orchestrator.generate_recommendations_batch(
                user_id, requests, self._session
            )
            for r in responses:
                r.calculation_id = str(uuid.uuid4())
            return responses

        # Fallback: evaluate individually without audit logging
        responses: list[RecommendationResponse] = []
        for request in requests:
            calculation_id = uuid.uuid4()
            response = await self._orchestrator.generate_recommendation(
                user_id, request, self._session
            )
            response.calculation_id = str(calculation_id)
            responses.append(response)
        return responses
