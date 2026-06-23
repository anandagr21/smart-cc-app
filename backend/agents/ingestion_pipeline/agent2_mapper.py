import logging
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate

from models.card_catalog import CardCatalog
from .state import IngestionState
from .llm import get_llm
from core.database import async_session_factory

logger = logging.getLogger(__name__)

# Reusing structures similar to card_intelligence to map into CardCatalog compatible JSON
class MappedRewardRule(BaseModel):
    category_name: str
    multiplier: float
    reward_type: str
    has_cap: bool
    cap_limit: Optional[float] = None
    merchant_exclusions: List[str] = Field(default_factory=list)

class MappedMilestone(BaseModel):
    spend_target: float
    reward_payout: str
    cycle: str

class MapperOutput(BaseModel):
    card_name: str
    bank_name: str
    network: str
    joining_fee: float = 0.0
    annual_fee: float = 0.0
    fee_waiver_spend_threshold: Optional[float] = None
    reward_rules: List[MappedRewardRule] = Field(default_factory=list)
    milestones: List[MappedMilestone] = Field(default_factory=list)
    validation_required: bool = Field(default=False, description="Set to true if reward or milestone info is ambiguous and cannot be confidently mapped.")

async def run_mapper_agent(state: IngestionState) -> IngestionState:
    logger.info("Running Mapper Agent")
    discovered_cards = state.get("discovered_cards", [])
    inserted_cards = state.get("inserted_cards", [])
    
    if not discovered_cards:
        logger.info("No newly discovered cards to map.")
        return state
        
    system_prompt = """You are a Data Mapper Agent. Your job is to convert raw extracted credit card details into a strict JSON schema.
CRITICAL RULES:
1. Extract, Normalize, Map, Store.
2. DO NOT Infer, Guess, Assume, or Invent.
3. If reward or milestone information is ambiguous or cannot be mapped with high confidence, set `validation_required` to true and map what you can.
4. Extract fees as numbers. If null or lifetime free, set to 0.0.
"""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", "Map the following card data:\n{card_data}")
    ])
    
    from .llm import invoke_structured
    
    new_inserted = []
    
    async with async_session_factory() as session:
        for card_data in discovered_cards:
            try:
                # Map using LLM
                result: MapperOutput = await invoke_structured(prompt, {"card_data": str(card_data)}, MapperOutput)
                
                if hasattr(result, "dict"):
                    mapped = result.dict()
                else:
                    mapped = result.model_dump()
                
                # Check if card already exists to avoid duplicates
                from sqlalchemy import select
                stmt = select(CardCatalog).where(
                    CardCatalog.card_name == mapped["card_name"],
                    CardCatalog.bank_name == mapped["bank_name"]
                )
                existing = await session.execute(stmt)
                if existing.scalars().first():
                    logger.info(f"Card {mapped['card_name']} already exists. Skipping insert.")
                    continue
                
                # Prepare JSON payloads
                reward_rules_json = {
                    "rules": mapped["reward_rules"],
                    "validation_required": mapped["validation_required"],
                    "raw_sources": card_data.get("source_urls", [])
                }
                milestones_json = {
                    "milestones": mapped["milestones"]
                }
                
                # Insert into DB
                db_card = CardCatalog(
                    card_name=mapped["card_name"],
                    bank_name=mapped["bank_name"],
                    network=mapped["network"],
                    joining_fee=mapped["joining_fee"],
                    annual_fee=mapped["annual_fee"],
                    fee_waiver_spend_threshold=mapped["fee_waiver_spend_threshold"],
                    reward_rules_json=reward_rules_json,
                    milestones_json=milestones_json
                    # Note: We do NOT set is_active or is_approved here per user constraint. Let them use defaults.
                )
                
                session.add(db_card)
                await session.flush()  # To get the ID
                
                new_inserted.append({
                    "card_id": str(db_card.id),
                    "card_name": db_card.card_name,
                    "bank_name": db_card.bank_name,
                    "mapped_data": mapped
                })
                
            except Exception as e:
                logger.error(f"Failed to map and insert card {card_data.get('card_name')}: {e}")
                
        await session.commit()
    
    logger.info(f"Mapper Agent inserted {len(new_inserted)} cards.")
    
    # Merge inserted cards
    all_inserted = inserted_cards + new_inserted
    return {"inserted_cards": all_inserted}
