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
        response = await self._orchestrator.generate_recommendation(user_id, request)
        
        # 3. Attach calculation_id
        response.calculation_id = str(calculation_id)
        if hasattr(response, "best_cashback_card") and response.best_cashback_card:
            # Optionally attach to optimization response items if needed, but top level is enough.
            pass

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
