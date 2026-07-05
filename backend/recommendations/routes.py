"""
Module: backend.recommendations.routes
Responsibility: HTTP endpoints for recommendations.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.rate_limit import limiter
from core.database import get_db
from api.deps import get_merchant_service, get_reward_rule_service, get_user_card_service
from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from recommendations.exceptions import NoCardsError
from recommendations.schemas import RecommendationRequest, RecommendationResponse
from schemas.common import SingleResponse

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


def _get_recommendation_service(
    merchant_service=Depends(get_merchant_service),
    user_card_service=Depends(get_user_card_service),
    reward_rule_service=Depends(get_reward_rule_service),
    db: AsyncSession = Depends(get_db),
):
    from recommendations.orchestrator import RecommendationOrchestrator  # heavy
    from recommendations.service import RecommendationService  # heavy
    orchestrator = RecommendationOrchestrator(
        merchant_service=merchant_service,
        user_card_service=user_card_service,
        reward_rule_service=reward_rule_service,
    )
    return RecommendationService(orchestrator=orchestrator, session=db)


@router.post(
    "/evaluate",
    response_model=SingleResponse[RecommendationResponse],
    status_code=status.HTTP_200_OK,
    summary="Evaluate transaction and get ranked card recommendations",
)
@limiter.limit("60/minute")
async def evaluate_transaction(
    request: Request,
    payload: RecommendationRequest,
    current_user: UserResponse = Depends(get_current_user),
    service: RecommendationService = Depends(_get_recommendation_service),
) -> dict:
    """Evaluate a transaction context against all active cards for the user."""
    try:
        result = await service.evaluate(current_user.id, payload)
        return {"data": result}
    except NoCardsError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
