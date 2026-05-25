"""
Module: backend.transactions.exceptions
Responsibility: Domain exceptions for the transactions module.
"""

from uuid import UUID


class TransactionError(Exception):
    """Base exception for transactions."""


class TransactionNotFoundError(TransactionError):
    """Raised when a transaction is not found."""
    def __init__(self, transaction_id: UUID):
        super().__init__(f"Transaction with id {transaction_id} not found.")


class InvalidTransactionError(TransactionError):
    """Raised when a transaction fails business validation."""
