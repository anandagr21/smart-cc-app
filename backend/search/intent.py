import json
import logging
from typing import Dict, Any, Optional

from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI

from core.config import get_settings
from search.schemas import IntentType, SearchResultType

logger = logging.getLogger(__name__)

# Fallback/Default intent if LLM fails
_DEFAULT_INTENT = IntentType.UNKNOWN


def _get_llm() -> ChatOpenAI:
    """Initialize the LLM for intent detection."""
    settings = get_settings()
    # Using deepseek-v4-flash as per the proxy configuration
    return ChatOpenAI(
        model="deepseek-v4-flash",
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
        temperature=0.0,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


async def detect_intent(query: str) -> Dict[str, Any]:
    """
    Detects the intent of a search query.
    
    Returns a dictionary matching SearchIntentResult schema shape:
    {
      "intent_type": "...",
      "entity_type": "...",
      "entity_name": "..."
    }
    """
    prompt = f"""You are a financial search intent detector.
Analyze the user's search query and determine their primary intent.

Intent Types:
- MERCHANT_LOOKUP: The user is searching for a specific merchant (e.g. "flipkart", "amazon", "swiggy")
- BEST_CARD_FOR_MERCHANT: The user wants to know the best card to use at a specific merchant (e.g. "best card for flipkart", "what to use at amazon")
- CATEGORY_DISCOVERY: The user is searching for a category of spend (e.g. "fuel cards", "dining rewards", "travel cards")
- FEATURE_SEARCH: The user is searching for a specific card feature (e.g. "cards with lounge access", "zero forex markup")
- UNKNOWN: Gibberish or unrelated queries.

Also extract the primary entity name if applicable (e.g., the merchant name for MERCHANT_LOOKUP and BEST_CARD_FOR_MERCHANT).

Query: "{query}"

You MUST respond in strictly valid JSON format with exactly these keys:
- "intent_type": string (one of the Intent Types above)
- "entity_name": string or null (the extracted entity name, e.g., "flipkart")
"""

    try:
        llm = _get_llm()
        messages = [
            SystemMessage(content="You are a helpful JSON-only API that outputs strictly valid JSON."),
            HumanMessage(content=prompt),
        ]
        
        response = await llm.ainvoke(messages)
        content = response.content.strip()
        
        # Strip potential markdown code blocks
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
            
        result = json.loads(content.strip())
        
        intent_type_str = result.get("intent_type", "UNKNOWN")
        try:
            intent_type = IntentType(intent_type_str)
        except ValueError:
            intent_type = IntentType.UNKNOWN
            
        return {
            "intent_type": intent_type,
            "entity_name": result.get("entity_name")
        }
        
    except Exception as e:
        logger.error(f"Intent detection failed for query '{query}': {str(e)}", exc_info=True)
        return {
            "intent_type": IntentType.UNKNOWN,
            "entity_name": None
        }
