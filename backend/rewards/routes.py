"""Module: backend.rewards.routes
Responsibility: HTTP interface for reward rule CRUD operations.

Architectural Boundaries:
- MUST NOT contain business logic (delegates to service).
- MUST NOT access the database directly (delegates to service → repository).
- MUST NOT calculate rewards or depend on the reward engine.
- Only responsible for request validation via Pydantic and response formatting.

Routes:
    POST   /reward-rules               — Create a new reward rule
    GET    /reward-rules/{rule_id}      — Get a single reward rule
    GET    /reward-rules/card/{card_id} — List all rules for a card
    PATCH  /reward-rules/{rule_id}      — Partial update a reward rule
    DELETE /reward-rules/{rule_id}      — Delete a reward rule
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Path

from api.deps import get_reward_rule_service
from auth.dependencies import get_current_user
from rewards.schemas import RewardRuleCreate, RewardRuleResponse, RewardRuleUpdate
from rewards.service import RewardRuleService
from schemas.common import PaginatedResponse, SingleResponse
from core.responses import ErrorResponse, Meta

router = APIRouter(prefix="/reward-rules", tags=["Reward Rules"])


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=SingleResponse[RewardRuleResponse],
    status_code=201,
)
async def create_reward_rule(
    body: RewardRuleCreate,
    current_user: dict = Depends(get_current_user),
    service: RewardRuleService = Depends(get_reward_rule_service),
) -> SingleResponse[RewardRuleResponse]:
    """Create a new reward rule.

    The provided rule_config is validated, normalized, and persisted.
    Returns the created rule with its assigned UUID and timestamps.
    """
    result = await service.create_rule(body)
    return SingleResponse[RewardRuleResponse](data=result)


# ---------------------------------------------------------------------------
# Read — single
# ---------------------------------------------------------------------------

@router.get(
    "/{rule_id}",
    response_model=SingleResponse[RewardRuleResponse],
)
async def get_reward_rule(
    rule_id: UUID = Path(..., description="The UUID of the reward rule"),
    current_user: dict = Depends(get_current_user),
    service: RewardRuleService = Depends(get_reward_rule_service),
) -> SingleResponse[RewardRuleResponse]:
    """Retrieve a single reward rule by its UUID."""
    result = await service.get_rule(rule_id)
    return SingleResponse[RewardRuleResponse](data=result)


# ---------------------------------------------------------------------------
# Read — by card
# ---------------------------------------------------------------------------

@router.get(
    "/card/{card_id}",
    response_model=PaginatedResponse[RewardRuleResponse],
)
async def list_rules_by_card(
    card_id: str = Path(..., description="The card identifier"),
    current_user: dict = Depends(get_current_user),
    service: RewardRuleService = Depends(get_reward_rule_service),
) -> PaginatedResponse[RewardRuleResponse]:
    """List all reward rules for a given card, sorted by priority (ascending)."""
    results = await service.get_card_rules(card_id)
    return PaginatedResponse[RewardRuleResponse](
        data=results,
        meta=Meta(
            total=len(results),
            page=1,
            page_size=max(len(results), 1),
            has_next=False,
        ),
    )


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

@router.patch(
    "/{rule_id}",
    response_model=SingleResponse[RewardRuleResponse],
)
async def update_reward_rule(
    body: RewardRuleUpdate,
    rule_id: UUID = Path(..., description="The UUID of the reward rule to update"),
    current_user: dict = Depends(get_current_user),
    service: RewardRuleService = Depends(get_reward_rule_service),
) -> SingleResponse[RewardRuleResponse]:
    """Partially update a reward rule.

    Only provided fields are changed. rule_config and rule_name are
    normalized before persisting.
    """
    result = await service.update_rule(rule_id, body)
    return SingleResponse[RewardRuleResponse](data=result)


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@router.delete(
    "/{rule_id}",
    status_code=204,
    responses={404: {"model": ErrorResponse}},
)
async def delete_reward_rule(
    rule_id: UUID = Path(..., description="The UUID of the reward rule to delete"),
    current_user: dict = Depends(get_current_user),
    service: RewardRuleService = Depends(get_reward_rule_service),
) -> None:
    """Permanently delete a reward rule."""
    await service.delete_rule(rule_id)
