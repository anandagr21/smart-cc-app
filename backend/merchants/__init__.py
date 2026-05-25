"""
Merchant Normalization Module
-----------------------------
Deterministic merchant name normalization, categorization, and matching.

Exposes:
- models: SQLModel DB entities (Merchant, MerchantAlias)
- schemas: Pydantic request/response schemas
- normalizer: Deterministic text normalization pipeline
- categorizer: Deterministic category mapping
- matcher: Merchant matching utilities
- repository: Data access layer
- service: Orchestration layer
- routes: HTTP API endpoints
- constants: Category and config constants
- exceptions: Domain-specific exceptions
"""

from merchants.models import Merchant, MerchantAlias
from merchants.schemas import (
    MerchantResponse,
    MerchantBriefResponse,
    MerchantSearchResponse,
    NormalizeResponse,
)
from merchants.normalizer import normalize, normalize_with_tokens
from merchants.categorizer import categorize, categorize_by_tokens
from merchants.matcher import find_best_match, MatchResult
from merchants.constants import MerchantCategory
from merchants.exceptions import (
    MerchantNotFoundException,
    MerchantAlreadyExistsException,
    AliasAlreadyExistsException,
    InvalidMerchantNameException,
)

__all__ = [
    "Merchant",
    "MerchantAlias",
    "MerchantResponse",
    "MerchantBriefResponse",
    "MerchantSearchResponse",
    "NormalizeResponse",
    "normalize",
    "normalize_with_tokens",
    "categorize",
    "categorize_by_tokens",
    "find_best_match",
    "MatchResult",
    "MerchantCategory",
    "MerchantNotFoundException",
    "MerchantAlreadyExistsException",
    "AliasAlreadyExistsException",
    "InvalidMerchantNameException",
]