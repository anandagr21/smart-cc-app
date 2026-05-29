"""
Module: backend.models
Responsibility: Centralizes all SQLModel entity imports for Alembic autogenerate.

All models MUST be imported here so that SQLModel.metadata discovers them
for migration generation.
"""

from merchants.models import Merchant, MerchantAlias
from .user import User
from .card_catalog import CardCatalog
from .user_card import UserCard
from transactions.models import Transaction
from .insight_suppression import InsightSuppression
from .transaction_optimization import TransactionOptimizationRecord
from .behavioral_profile import UserBehavioralProfile
from .optimization_profile import OptimizationPersonalityProfile
from behavioral_memory.models import RecommendationBehaviorRecord
from portfolio_evolution.models import PortfolioEvolutionSnapshot
from card_intelligence.models import (
    CardKnowledgeSource, 
    KnowledgeIngestionJob,
    SourceTextArtifact,
    ExtractionSnapshot,
    ExtractionRun,
    CardExtractionCandidate,
    CardIntelligenceVersion
)

__all__ = [
    "CardCatalog",
    "Merchant",
    "MerchantAlias",
    "User",
    "UserCard",
    "InsightSuppression",
    "TransactionOptimizationRecord",
    "UserBehavioralProfile",
    "OptimizationPersonalityProfile",
    "RecommendationBehaviorRecord",
    "PortfolioEvolutionSnapshot",
    "CardKnowledgeSource",
    "KnowledgeIngestionJob",
    "SourceTextArtifact",
    "ExtractionSnapshot",
    "ExtractionRun",
    "CardExtractionCandidate",
    "CardIntelligenceVersion",
]
