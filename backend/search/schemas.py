import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class IntentType(str, Enum):
    MERCHANT_LOOKUP = 'MERCHANT_LOOKUP'
    BEST_CARD_FOR_MERCHANT = 'BEST_CARD_FOR_MERCHANT'
    CATEGORY_DISCOVERY = 'CATEGORY_DISCOVERY'
    FEATURE_SEARCH = 'FEATURE_SEARCH'
    UNKNOWN = 'UNKNOWN'

class SearchResultType(str, Enum):
    MERCHANT = 'MERCHANT'
    CARD = 'CARD'
    OFFER = 'OFFER'
    CATEGORY = 'CATEGORY'
    BANK = 'BANK'
    REWARD_PROGRAM = 'REWARD_PROGRAM'

class SearchIntentResult(BaseModel):
    intent_type: IntentType
    entity_type: Optional[SearchResultType] = None
    entity_id: Optional[uuid.UUID] = None
    entity_name: Optional[str] = None
    confidence: float
    resolution_type: str

class SearchSuggestion(BaseModel):
    id: str
    type: SearchResultType
    title: str
    preview: Optional[str] = None
    icon: Optional[str] = None
    score: float = 0.0

class GroupedSearchSuggestions(BaseModel):
    merchants: List[SearchSuggestion] = []
    cards: List[SearchSuggestion] = []
    offers: List[SearchSuggestion] = []
    categories: List[SearchSuggestion] = []

class SearchEventCreate(BaseModel):
    session_id: Optional[uuid.UUID] = None
    event_type: str
    payload: Optional[Dict[str, Any]] = None

class SearchResolveRequest(BaseModel):
    query: str
    session_id: Optional[uuid.UUID] = None

class SearchResolveResponse(BaseModel):
    session_id: uuid.UUID
    intent: SearchIntentResult

class SearchSessionResponse(BaseModel):
    session_id: uuid.UUID
    raw_query: str
