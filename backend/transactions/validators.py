"""
Module: backend.transactions.validators
Responsibility: Pure business logic validation for transactions.
"""

from datetime import date

from transactions.constants import TransactionStatus
from transactions.exceptions import InvalidTransactionError


def validate_transaction_dates(transaction_date: date, posted_date: date | None) -> None:
    """Validate that dates make chronological sense."""
    today = date.today()
    
    # We allow transactions slightly in the future due to timezone differences, 
    # but not far in the future.
    if (transaction_date - today).days > 1:
        raise InvalidTransactionError("Transaction date cannot be in the future.")
        
    if posted_date:
        if posted_date < transaction_date:
            raise InvalidTransactionError("Posted date cannot be before transaction date.")
        if (posted_date - today).days > 1:
            raise InvalidTransactionError("Posted date cannot be in the future.")


def validate_status_transition(current: TransactionStatus, new_status: TransactionStatus, posted_date: date | None) -> None:
    """Validate status transitions and required fields."""
    if current == TransactionStatus.REVERSED:
        raise InvalidTransactionError("Cannot update a reversed transaction.")
        
    if new_status == TransactionStatus.POSTED and not posted_date:
        raise InvalidTransactionError("Posted date is required when status is posted.")
