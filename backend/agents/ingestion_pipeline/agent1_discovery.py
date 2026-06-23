import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from .state import IngestionState
from .search import get_search_provider
from .llm import get_llm

logger = logging.getLogger(__name__)

class DiscoveredCard(BaseModel):
    card_name: str = Field(description="Full name of the credit card")
    issuer: str = Field(description="Issuing bank name")
    network: str = Field(description="Payment network (e.g., Visa, Mastercard, Rupay)")
    joining_fee: Optional[float] = Field(default=None, description="One-time fee charged when the card is first issued (INR)")
    annual_fee: Optional[float] = Field(default=None, description="Recurring annual fee (INR)")
    fee_waiver_criteria: Optional[str] = Field(default=None, description="Criteria to waive the annual fee")
    reward_details: Optional[str] = Field(default=None, description="Details of the reward structure")
    cashback_details: Optional[str] = Field(default=None, description="Details of cashback rules")
    milestone_benefits: Optional[str] = Field(default=None, description="Milestone benefits and their targets")
    lounge_benefits: Optional[str] = Field(default=None, description="Lounge access details")
    fuel_benefits: Optional[str] = Field(default=None, description="Fuel surcharge waiver or benefits")
    exclusions: Optional[str] = Field(default=None, description="Exclusions for rewards or benefits")
    welcome_benefits: Optional[str] = Field(default=None, description="Welcome benefits or bonus")
    source_urls: List[str] = Field(default_factory=list, description="List of source URLs from where the info was extracted")

class DiscoveryOutput(BaseModel):
    cards: List[DiscoveredCard] = Field(description="List of discovered cards")

async def run_discovery_agent(state: IngestionState) -> IngestionState:
    logger.info("Running Discovery Agent")
    existing_cards = state.get("existing_card_names", [])
    target_card = state.get("target_card")
    
    search = get_search_provider()
    
    if target_card:
        query = f"{target_card} credit card official details features benefits"
        search_results = search.search(query)
        system_prompt = f"""You are a Discovery Agent for a credit card database in India.
Your goal is to extract complete credit card information for the specified credit card: {target_card} from the provided search results.
Prioritize official bank websites, MITC documents, and product brochures.
Extract fields like card name, issuer, network, joining fee, annual fee, waivers, rewards, cashback, milestones, lounge, fuel, exclusions, and welcome benefits.
CRITICAL:
1. Store source URLs for every extracted field (put them in source_urls).
2. Never guess missing information.
3. Use null when information cannot be verified.
"""
    else:
        query = "top Indian credit cards official bank site"
        search_results = search.search(query)
        system_prompt = """You are a Discovery Agent for a credit card database in India.
Your goal is to extract complete credit card information from the provided search results.
Prioritize official bank websites, MITC documents, and product brochures.
Do NOT extract cards that are already present in the existing database.
Extract fields like card name, issuer, network, joining fee, annual fee, waivers, rewards, cashback, milestones, lounge, fuel, exclusions, and welcome benefits.
CRITICAL:
1. Store source URLs for every extracted field (put them in source_urls).
2. Never guess missing information.
3. Use null when information cannot be verified.
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", "Existing cards (DO NOT EXTRACT THESE):\n{existing_cards}\n\nSearch Results:\n{search_results}")
    ])
    
    from .llm import invoke_structured
    result: DiscoveryOutput = await invoke_structured(prompt, {
        "existing_cards": ", ".join(existing_cards) if existing_cards else "None",
        "search_results": search_results
    }, DiscoveryOutput)
    
    # If the LLM returns an object that can be serialized
    if hasattr(result, "dict"):
        discovered = result.dict()["cards"]
    else:
        # Pydantic v2
        discovered = result.model_dump()["cards"]
        
    logger.info(f"Discovery Agent found {len(discovered)} new cards.")
    
    return {"discovered_cards": discovered}
