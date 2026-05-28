from merchant_intelligence.repository import MerchantRepository
from merchant_intelligence.schemas import CanonicalMerchant
from merchant_intelligence.categories import MerchantCategory

class MerchantMatcher:
    def __init__(self, repository: MerchantRepository):
        self.repository = repository
        
    def normalize(self, raw_name: str) -> CanonicalMerchant:
        if not raw_name:
            return self._fallback("UNKNOWN")
            
        # 1. Check exact alias match via repository
        match = self.repository.find_by_alias(raw_name)
        if match:
            return match
            
        # 2. Fallback to generic using the raw name
        return self._fallback(raw_name.strip())
        
    def _fallback(self, name: str) -> CanonicalMerchant:
        return CanonicalMerchant(
            canonical_name=name.upper()[:50].replace(" ", "_"),
            display_name=name.title(),
            category=MerchantCategory.GENERAL_SPEND,
            confidence_score=0.4  # Low confidence, generic fallback
        )
