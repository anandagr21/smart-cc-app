from merchant_intelligence.repository import InMemoryMerchantRepository
from merchant_intelligence.matcher import MerchantMatcher
from merchant_intelligence.schemas import CanonicalMerchant

# Singleton instances
_repository = InMemoryMerchantRepository()
_matcher = MerchantMatcher(repository=_repository)

class MerchantIntelligenceService:
    @staticmethod
    def normalize_merchant(raw_name: str) -> CanonicalMerchant:
        """
        Takes a raw merchant string from the user and deterministically 
        resolves it into a CanonicalMerchant with categories and confidence.
        """
        return _matcher.normalize(raw_name)
