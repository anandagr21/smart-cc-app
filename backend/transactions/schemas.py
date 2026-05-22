"""
Module: backend.transactions.schemas
Responsibility: API Request and Response schemas for Transactions.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from transactions.constants import Currency, PaymentMode, TransactionStatus, TransactionType


class TransactionBase(BaseModel):
    """Shared fields for transaction schemas."""
    user_card_id: UUID
    merchant_name: str = Field(..., min_length=1)
    amount: Decimal = Field(..., gt=0, description="Transaction amount must be positive.")
    currency: Currency = Field(default=Currency.INR)
    payment_mode: PaymentMode = Field(default=PaymentMode.ANY)
    transaction_type: TransactionType = Field(default=TransactionType.PURCHASE)
    transaction_date: date
    description: Optional[str] = None
    external_reference: Optional[str] = None
    raw_description: Optional[str] = None
    source: str = Field(default="manual")
    statement_id: Optional[UUID] = None


class TransactionCreate(TransactionBase):
    """Payload to create a new transaction."""
    pass


class TransactionUpdateStatus(BaseModel):
    """Payload to update a transaction's status."""
    status: TransactionStatus
    posted_date: Optional[date] = None


class TransactionResponse(TransactionBase):
    """Output schema for a transaction."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    normalized_merchant: str
    category: str
    status: TransactionStatus
    posted_date: Optional[date] = None
    created_at: datetime


class EnrichedTransactionResponse(TransactionResponse):
    """Output schema for an enriched transaction with computed reward insights."""
    
    # Insights
    reward_earned: Optional[Decimal] = Field(default=None, description="Effective INR value of rewards earned")
    reward_type: Optional[str] = Field(default=None, description="Type of reward earned (cashback, points, miles)")
    
    # Optimization 
    best_possible_card: Optional[str] = Field(default=None, description="Name of the #1 ranked card for this transaction")
    missed_savings: Optional[Decimal] = Field(default=None, description="Additional INR value that could have been earned")
    
    # Semantics & Education
    recommendation_reason: Optional[str] = Field(default=None, description="Primary reason the used card earned this reward")
    warnings: list[str] = Field(default_factory=list, description="Warnings related to this transaction (e.g. cap reached)")
