from abc import ABC, abstractmethod
from typing import Optional
from merchant_intelligence.schemas import CanonicalMerchant
from merchant_intelligence.aliases import MERCHANT_ALIASES

class MerchantRepository(ABC):
    """
    Abstract interface for merchant persistence.
    Allows trivial swapping to PostgresMerchantRepository later without changing normalization logic.
    """
    @abstractmethod
    def find_by_alias(self, raw_name: str) -> Optional[CanonicalMerchant]:
        pass

class InMemoryMerchantRepository(MerchantRepository):
    """Phase 1: In-memory alias dictionary for deterministic, zero-infra normalization."""
    def find_by_alias(self, raw_name: str) -> Optional[CanonicalMerchant]:
        normalized = raw_name.strip().lower()
        if normalized in MERCHANT_ALIASES:
            data = MERCHANT_ALIASES[normalized]
            return CanonicalMerchant(
                canonical_name=data["canonical"],
                display_name=data["display"],
                category=data["category"],
                confidence_score=0.96  # High confidence for deterministic map
            )
        return None
