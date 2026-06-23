import logging
from typing import List, Dict, Any, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from sqlalchemy import select
from langchain_core.prompts import ChatPromptTemplate

from models.card_catalog import CardCatalog
from core.database import async_session_factory
from .state import IngestionState
from .search import get_search_provider
from .llm import get_llm
from datetime import datetime

logger = logging.getLogger(__name__)

class FixUpdate(BaseModel):
    field: str
    old: str
    new: Any
    source: str
    timestamp: str

class FixerOutput(BaseModel):
    fixed: bool = Field(description="True if fixes were applied")
    changes: List[FixUpdate] = Field(default_factory=list)
    updated_annual_fee: Optional[float] = None
    updated_joining_fee: Optional[float] = None
    updated_fee_waiver: Optional[float] = None
    updated_reward_rules: Optional[List[Dict[str, Any]]] = None
    updated_milestones: Optional[List[Dict[str, Any]]] = None

async def run_fix_agent(state: IngestionState) -> IngestionState:
    logger.info("Running Fix Agent")
    cards_to_fix = state.get("cards_to_fix", [])
    validation_reports = state.get("validation_reports", {})
    fix_retries = state.get("fix_retries", {})
    
    if not cards_to_fix:
        return state
        
    search = get_search_provider()
    
    system_prompt = """You are a Data Correction Agent.
Your job is to read the validation failures and the search results, and provide the correct values for the specific failed fields.
CRITICAL RULES:
1. Fix ONLY fields that failed validation.
2. NEVER delete cards, create cards, merge cards, or rename issuers.
3. You must provide the old value, new value, and the specific source URL for every change.
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", "Card Validation Failures:\n{failures}\n\nSearch Results:\n{search_results}")
    ])
    
    from .llm import invoke_structured
    
    async with async_session_factory() as session:
        for card_id_str in list(cards_to_fix):
            retries = fix_retries.get(card_id_str, 0)
            if retries >= 3:
                logger.warning(f"Card {card_id_str} reached max retries (3). Skipping fix.")
                continue
                
            report = validation_reports.get(card_id_str)
            if not report or report["status"] != "FAIL":
                continue
                
            # Fetch from DB
            stmt = select(CardCatalog).where(CardCatalog.id == UUID(card_id_str))
            db_res = await session.execute(stmt)
            db_card = db_res.scalars().first()
            
            if not db_card:
                continue
                
            # Search specifically for the failures
            failure_str = "\n".join([f"{f['field']}: Expected {f['expected']}, Found {f['found']}" for f in report["failures"]])
            query = f"{db_card.card_name} {db_card.bank_name} " + " ".join([f['field'] for f in report["failures"]]) + " official"
            search_results = search.search(query)
            
            # Request fixes
            result: FixerOutput = await invoke_structured(prompt, {
                "failures": failure_str,
                "search_results": search_results
            }, FixerOutput)
            
            if hasattr(result, "dict"):
                fix_data = result.dict()
            else:
                fix_data = result.model_dump()
                
            if fix_data.get("fixed"):
                # Apply changes
                for change in fix_data["changes"]:
                    change["timestamp"] = datetime.utcnow().isoformat()
                    logger.info(f"FIX APPLIED to {card_id_str}: {change}")
                    
                # We carefully update only what was returned as updated
                if fix_data.get("updated_annual_fee") is not None:
                    db_card.annual_fee = fix_data["updated_annual_fee"]
                if fix_data.get("updated_joining_fee") is not None:
                    db_card.joining_fee = fix_data["updated_joining_fee"]
                if fix_data.get("updated_fee_waiver") is not None:
                    db_card.fee_waiver_spend_threshold = fix_data["updated_fee_waiver"]
                if fix_data.get("updated_reward_rules") is not None:
                    rules_json = db_card.reward_rules_json or {}
                    rules_json["rules"] = fix_data["updated_reward_rules"]
                    db_card.reward_rules_json = rules_json
                if fix_data.get("updated_milestones") is not None:
                    miles_json = db_card.milestones_json or {}
                    miles_json["milestones"] = fix_data["updated_milestones"]
                    db_card.milestones_json = miles_json
                    
                # Note: DB commits at end of session
            
            # Increment retry
            fix_retries[card_id_str] = retries + 1
            
        await session.commit()
        
    return {
        "fix_retries": fix_retries
    }
