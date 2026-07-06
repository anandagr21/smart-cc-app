"""
Module: backend.reward_engine.eval_routes
Responsibility: FastAPI route that accepts a transaction + normalized rule configs
and returns a deterministic evaluation result.

Architectural Boundaries:
- This route is an HTTP adapter ONLY — validates input, calls the engine, returns output.
- MUST NOT contain reward calculation logic (delegates to evaluator.py).
- MUST NOT access the database.
- MUST NOT call AI providers.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends, status

from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from reward_engine.schemas import (
    EvaluateRequest,
    EvaluateResponse,
    NormalizedRuleConfig,
    TransactionContext,
)

router = APIRouter(tags=["reward-engine"])


@router.post(
    "/reward-engine/evaluate",
    response_model=EvaluateResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate rewards for a transaction",
    description=(
        "Accepts a transaction context and a list of normalized rule configs, "
        "then returns a deterministic evaluation result with matched rules, "
        "cashback, points, exclusions, and caps."
    ),
)
async def evaluate_reward(
    request: Annotated[
        EvaluateRequest,
        Body(
            description="Transaction context with normalized reward rules to evaluate against.",
            examples=[
                {
                    "transaction": {
                        "merchant": "swiggy",
                        "category": "online",
                        "amount": 1000,
                        "payment_mode": "credit_card",
                        "transaction_date": "2026-05-20T12:00:00",
                    },
                    "rules": [
                        {
                            "card_id": "card-1",
                            "rule_name": "Swiggy 10% Cashback",
                            "rule_type": "cashback",
                            "priority": 1,
                            "rule_config": {
                                "reward_rate": 0.10,
                                "merchant": "swiggy",
                            },
                        },
                        {
                            "card_id": "card-1",
                            "rule_name": "Online 5%",
                            "rule_type": "cashback",
                            "priority": 2,
                            "rule_config": {
                                "reward_rate": 0.05,
                                "category": "online",
                            },
                        },
                    ],
                }
            ],
        ),
    ],
    _user: UserResponse = Depends(get_current_user),
) -> EvaluateResponse:
    """Evaluate applicable rewards for the given transaction and rule set.

    This endpoint is the public API for the deterministic reward engine.
    It consumes normalized rule configs (pre-processed by the rewards service)
    and produces an EvaluationResult with:
      - matched_rules
      - cashback_amount
      - reward_points
      - effective_reward_value
      - exclusions_applied
      - caps_applied
      - explanations
      - warnings
    """
    # Parse the incoming request into domain objects.
    transaction = TransactionContext.model_validate(request.transaction)
    rules = [NormalizedRuleConfig.model_validate(r) for r in request.rules]

    # Lazy import — evaluator pulls in the full reward engine
    from reward_engine.evaluator import evaluate

    # Delegate to the pure engine — no side effects.
    result = evaluate(transaction, rules)

    return EvaluateResponse.model_validate(result.model_dump())