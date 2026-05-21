"""
Module: backend.recommendations.routes
Responsibility: HTTP endpoints for recommendations.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from api.deps import get_merchant_service, get_reward_rule_service, get_user_card_service
from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from merchants.service import MerchantService
from recommendations.exceptions import NoCardsError
from recommendations.orchestrator import RecommendationOrchestrator
from recommendations.schemas import RecommendationRequest, RecommendationResponse
from recommendations.service import RecommendationService
from rewards.service import RewardRuleService
from schemas.common import SingleResponse
from services.card_service import UserCardService

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


def _get_recommendation_service(
    merchant_service: MerchantService = Depends(get_merchant_service),
    user_card_service: UserCardService = Depends(get_user_card_service),
    reward_rule_service: RewardRuleService = Depends(get_reward_rule_service),
) -> RecommendationService:
    orchestrator = RecommendationOrchestrator(
        merchant_service=merchant_service,
        user_card_service=user_card_service,
        reward_rule_service=reward_rule_service,
    )
    return RecommendationService(orchestrator=orchestrator)


@router.post(
    "/evaluate",
    response_model=SingleResponse[RecommendationResponse],
    status_code=status.HTTP_200_OK,
    summary="Evaluate transaction and get ranked card recommendations",
)
async def evaluate_transaction(
    request: RecommendationRequest,
    current_user: UserResponse = Depends(get_current_user),
    service: RecommendationService = Depends(_get_recommendation_service),
) -> dict:
    """Evaluate a transaction context against all active cards for the user."""
    try:
        result = await service.evaluate(current_user.id, request)
        return {"data": result}
    except NoCardsError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
