import logging
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from merchants.fuzzy import fuzzy_search
from merchants.categorizer import MerchantCategory
from search.schemas import GroupedSearchSuggestions, SearchSuggestion, SearchResultType

logger = logging.getLogger(__name__)

# Static categories for now
STATIC_CATEGORIES = [
    {"id": "cat_fuel", "title": "Fuel", "category": MerchantCategory.FUEL},
    {"id": "cat_dining", "title": "Dining", "category": MerchantCategory.DINING},
    {"id": "cat_travel", "title": "Travel", "category": MerchantCategory.TRAVEL},
    {"id": "cat_grocery", "title": "Grocery", "category": MerchantCategory.GROCERY},
    {"id": "cat_shopping", "title": "Online Shopping", "category": MerchantCategory.ECOMMERCE},
    {"id": "cat_utility", "title": "Utility", "category": MerchantCategory.UTILITIES},
]

async def get_search_suggestions(query: str, db: AsyncSession) -> GroupedSearchSuggestions:
    """
    Get typeahead suggestions grouped by entity type.
    """
    if not query or len(query) < 2:
        return GroupedSearchSuggestions()

    normalized_query = query.lower().strip()
    
    # Ensure fuzzy index is loaded
    from merchants.fuzzy import is_index_valid
    from merchants.resolution_engine import _load_index
    if not is_index_valid():
        await _load_index(db)
    
    # 1. Search Merchants using Fuzzy Index
    merchant_suggestions: List[SearchSuggestion] = []
    
    # fuzzy_search uses RapidFuzz index under the hood
    fuzzy_results = fuzzy_search(normalized_query, top_n=5)
    for result in fuzzy_results:
        # Rapidfuzz returns 0-100 score, we'll keep it as the ranking signal
        merchant_suggestions.append(SearchSuggestion(
            id=str(result.merchant_id),
            type=SearchResultType.MERCHANT,
            title=result.merchant_canonical_name,
            preview=result.category, # e.g. "Online Shopping"
            score=result.score
        ))

    # 2. Search Categories
    category_suggestions: List[SearchSuggestion] = []
    for cat in STATIC_CATEGORIES:
        # Simple substring match
        if normalized_query in cat["title"].lower():
            category_suggestions.append(SearchSuggestion(
                id=cat["id"],
                type=SearchResultType.CATEGORY,
                title=cat["title"],
                score=80.0 # Static base score
            ))

    # 3. Future: Search Cards
    card_suggestions: List[SearchSuggestion] = []
    
    # 4. Future: Search Offers
    offer_suggestions: List[SearchSuggestion] = []

    return GroupedSearchSuggestions(
        merchants=merchant_suggestions,
        categories=category_suggestions,
        cards=card_suggestions,
        offers=offer_suggestions
    )
