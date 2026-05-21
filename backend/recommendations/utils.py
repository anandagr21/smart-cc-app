"""
Module: backend.recommendations.utils
Responsibility: Pure helpers for recommendations orchestration.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from recommendations.schemas import RecommendationRequest
from reward_engine.constants import PaymentMode
from reward_engine.schemas import TransactionContext


def build_transaction_context(
    request: RecommendationRequest,
    canonical_merchant: str,
    category: str,
) -> TransactionContext:
    """Build a TransactionContext from a user request and normalized merchant details.

    Infers `is_online` from payment_mode.
    Uses today's date if transaction_date is omitted.
    """
    is_online = request.payment_mode == PaymentMode.ONLINE
    txn_date = request.transaction_date or date.today()
    
    # We pass 'any' to payment_mode string if we aren't sure,
    # but request.payment_mode will be an enum or string.
    pm_value = request.payment_mode.value if hasattr(request.payment_mode, "value") else str(request.payment_mode)

    return TransactionContext(
        merchant=canonical_merchant,
        category=category,
        amount=request.amount,
        payment_mode=pm_value,
        transaction_date=txn_date,
        is_online=is_online,
        mcc_code=request.mcc_code,
        cumulative_spend=0,  # Could be hydrated from analytics module later
    )
