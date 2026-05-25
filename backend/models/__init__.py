"""
Module: backend.models
Responsibility: Centralizes all SQLModel entity imports for Alembic autogenerate.

All models MUST be imported here so that SQLModel.metadata discovers them
for migration generation.
"""

from merchants.models import Merchant, MerchantAlias
from models.card_catalog import CardCatalog
from models.user import User
from models.user_card import UserCard
from models.insight_suppression import InsightSuppression

__all__ = [
    "CardCatalog",
    "Merchant",
    "MerchantAlias",
    "User",
    "UserCard",
    "InsightSuppression",
]
