import json
import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from merchants.resolution_engine import resolve as resolve_merchant
from merchants.schemas import ResolutionRequest
from search.intent import detect_intent
from search.models import SearchSession, SearchCache
from search.schemas import IntentType, SearchResultType, SearchIntentResult

logger = logging.getLogger(__name__)

async def resolve_search_query(query: str, session_id: Optional[UUID], db: AsyncSession) -> SearchIntentResult:
    """
    Core search orchestrator.
    Pipeline:
    1. Intent Detection
    2. Entity Resolution (if applicable)
    3. Formatting Intent Result
    """
    # 1. Intent Detection
    intent_data = await detect_intent(query)
    intent_type = intent_data["intent_type"]
    entity_name = intent_data["entity_name"]
    
    # Defaults
    entity_type = None
    entity_id = None
    confidence = 0.0
    resolution_type = "UNKNOWN"

    # 2. Entity Resolution
    if intent_type in (IntentType.MERCHANT_LOOKUP, IntentType.BEST_CARD_FOR_MERCHANT) and entity_name:
        resolution = await resolve_merchant(entity_name, db)
        
        entity_type = SearchResultType.MERCHANT
        entity_id = resolution.merchant_id
        entity_name = resolution.merchant_name or entity_name
        confidence = resolution.confidence
        resolution_type = resolution.resolution_type
        
    # 3. Cache and log (to be implemented)
    
    return SearchIntentResult(
        intent_type=intent_type,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        confidence=confidence,
        resolution_type=resolution_type
    )
