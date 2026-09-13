
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
    card_id: str | None = None
    
    class Config:
        arbitrary_types_allowed = True

class TransactionEnrichmentService:
    def __init__(self, merchant_service: MerchantService):
        self.merchant_service = merchant_service

    async def enrich_transactions(self, transactions: list[Transaction]) -> list[EnrichedTransaction]:
        """
        Takes raw transactions and enriches them with normalized merchant names,
        canonical categories, and other metadata BEFORE they reach generators.

        Uses the already-stored normalized_merchant and category from the
        Transaction model. Only falls back to full merchant resolution for
        legacy transactions that lack normalized data.
        """
        enriched = []
        for tx in transactions:
            # Use pre-normalized data from the transaction if available (avoids
            # expensive per-transaction merchant resolution DB lookups)
            if tx.normalized_merchant:
                normalized_name = tx.normalized_merchant
                category = tx.category or "unknown"
            else:
                # In-memory deterministic normalization — zero DB lookups
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
