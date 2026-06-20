"""
Module: backend.transactions.models
Responsibility: SQLModel definition for the Transaction entity.

Architectural Boundaries:
- Pure data schema.
- Represents the source of truth for financial transaction history.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, Index, SQLModel, UniqueConstraint

from transactions.constants import Currency, PaymentMode, TransactionStatus, TransactionType


class Transaction(SQLModel, table=True):
    """Normalized record of a credit card transaction.
    
    Serves as the financial source of truth. Designed to be append-only 
    for corrections (though status transitions are allowed).
    """

    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uix_user_id_idempotency_key"),
        Index("ix_transactions_user_date", "user_id", "transaction_date"),
        Index("ix_transactions_card_date", "user_card_id", "transaction_date"),
        Index("ix_transactions_card_type_status", "user_card_id", "transaction_type", "status"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(index=True)
    user_card_id: UUID = Field(index=True)
    
    # Merchant context
    merchant_name: str
    normalized_merchant: str = Field(index=True)
    category: str = Field(index=True)
    
    # Financial details
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    currency: Currency = Field(default=Currency.INR)
    payment_mode: PaymentMode = Field(default=PaymentMode.ANY)
    transaction_type: TransactionType = Field(default=TransactionType.PURCHASE)
    
    # Timing
    transaction_date: date = Field(index=True)
    posted_date: Optional[date] = Field(default=None)
    
    # Optional metadata
    description: Optional[str] = Field(default=None)
    external_reference: Optional[str] = Field(default=None, index=True)
    
    # Future-proofing fields for OCR/Reconciliation
    raw_description: Optional[str] = Field(default=None)
    source: Optional[str] = Field(default="manual")
    statement_id: Optional[UUID] = Field(default=None, index=True)
    idempotency_key: Optional[str] = Field(default=None, max_length=100)
    
    # Lifecycle
    status: TransactionStatus = Field(default=TransactionStatus.PENDING, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
