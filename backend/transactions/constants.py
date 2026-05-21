"""
Module: backend.transactions.constants
Responsibility: Enumerations and constants for the transactions domain.
"""

from enum import Enum


class TransactionStatus(str, Enum):
    """Lifecycle status of a transaction."""
    PENDING = "pending"
    POSTED = "posted"
    REVERSED = "reversed"


class TransactionType(str, Enum):
    """Nature of the transaction."""
    PURCHASE = "purchase"
    REFUND = "refund"
    REVERSAL = "reversal"
    FEE = "fee"
    EMI = "emi"


class Currency(str, Enum):
    """Supported currencies."""
    INR = "INR"
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"


class PaymentMode(str, Enum):
    """Supported payment modes for transactions."""
    ONLINE = "online"
    OFFLINE = "offline"
    CONTACTLESS = "contactless"
    UPI = "upi"
    INTERNATIONAL = "international"
    ANY = "any"
