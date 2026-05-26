from typing import List, Optional
from pydantic import BaseModel
from merchants.service import MerchantService
from transactions.models import Transaction

class EnrichedTransaction(BaseModel):
    id: str
    original_merchant_name: str
    amount: float
    normalized_merchant_name: str
    category: str
    date: str
    card_id: Optional[str] = None
    
    class Config:
        arbitrary_types_allowed = True

class TransactionEnrichmentService:
    def __init__(self, merchant_service: MerchantService):
        self.merchant_service = merchant_service

    async def enrich_transactions(self, transactions: List[Transaction]) -> List[EnrichedTransaction]:
        """
        Takes raw transactions and enriches them with normalized merchant names,
        canonical categories, and other metadata BEFORE they reach generators.
        """
        enriched = []
        for tx in transactions:
            # 1. Normalize merchant
            match_res = await self.merchant_service.find_best_match(tx.merchant_name)
            
            if match_res.merchant:
                normalized_name = match_res.merchant.canonical_name
                category = match_res.merchant.category
            else:
                # Fallback to pure normalization if no DB match
                norm_res = self.merchant_service.normalize_merchant(tx.merchant_name)
                normalized_name = norm_res.canonical_name
                category = norm_res.category or "unknown"

            enriched.append(EnrichedTransaction(
                id=str(tx.id),
                original_merchant_name=tx.merchant_name,
                amount=float(tx.amount),
                normalized_merchant_name=normalized_name,
                category=category,
                date=tx.transaction_date.isoformat(),
                card_id=str(tx.user_card_id) if tx.user_card_id else None
            ))
            
        return enriched
