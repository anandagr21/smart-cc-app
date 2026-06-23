import asyncio
import os
import sys
import logging
from uuid import UUID

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from core.database import async_session_factory, init_db
from models.card_catalog import CardCatalog
from agents.ingestion_pipeline.llm import invoke_structured
from agents.ingestion_pipeline.search import get_search_provider
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import List, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FixData(BaseModel):
    field_name_in_db: str = Field(description="The exact database column name (e.g., 'reward_rules_json', 'milestones_json', 'annual_fee', 'joining_fee', 'fee_waiver_spend_threshold', 'network')")
    new_value: Any = Field(description="The new correctly formatted value to insert into the database.")

class FixerOutput(BaseModel):
    fixes: List[FixData]

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a Database Fix Agent for a credit card database. Based on the validation failures and new search results, provide the exact new values to store in the database.\n\nCRITICAL DATA TYPE RULES:\n- For numeric fields like 'annual_fee', 'joining_fee', 'fee_waiver_spend_threshold', you MUST provide a pure numeric float value (e.g. 5000.0 or 0.0). DO NOT include currency symbols, commas, or text like 'GST'.\n- For JSON fields like 'reward_rules_json' or 'milestones_json', provide the full valid JSON structure (arrays or objects).\n- For strings like 'network', provide just the string."),
    ("user", "Card Validation Failures:\n{failures}\n\nSearch Results:\n{search_results}")
])

def parse_report(content: str):
    failures = []
    sections = content.split("### ")
    for section in sections[1:]:
        lines = section.strip().split("\n")
        field = lines[0].strip()
        
        status = None
        expected = ""
        found = ""
        
        curr_section = None
        for line in lines[1:]:
            if line.startswith("Status:"):
                status = line.split(":", 1)[1].strip()
            elif line.startswith("Expected:"):
                curr_section = "expected"
                expected += line.split(":", 1)[1].strip() + "\n"
            elif line.startswith("Found:"):
                curr_section = "found"
                found += line.split(":", 1)[1].strip() + "\n"
            elif curr_section == "expected":
                expected += line + "\n"
            elif curr_section == "found":
                found += line + "\n"
                
        if status == "FAIL":
            failures.append({
                "field": field,
                "expected": expected.strip(),
                "found": found.strip()
            })
    return failures

async def fix_card(filepath: str):
    filename = os.path.basename(filepath)
    card_id_str = filename.replace("card_validation_", "").replace(".md", "")
    
    with open(filepath, "r") as f:
        content = f.read()
        
    failures = parse_report(content)
    if not failures:
        os.remove(filepath) # Remove the report since it passed validation
        return
        
    async with async_session_factory() as session:
        try:
            stmt = select(CardCatalog).where(CardCatalog.id == UUID(card_id_str))
        except ValueError:
            stmt = select(CardCatalog).where(CardCatalog.id == card_id_str)
            
        db_res = await session.execute(stmt)
        db_card = db_res.scalars().first()
        
        if not db_card:
            logger.warning(f"Card {card_id_str} not found in DB")
            return
            
        failure_str = "\n".join([f"{f['field']}: Expected {f['expected']}, Found {f['found']}" for f in failures])
        logger.info(f"Fixing {db_card.card_name} - {len(failures)} failures")
        
        search = get_search_provider()
        query = f"{db_card.card_name} {db_card.bank_name} " + " ".join([f['field'] for f in failures]) + " official"
        search_results = search.search(query)
        
        try:
            result: FixerOutput = await invoke_structured(prompt, {
                "failures": failure_str,
                "search_results": search_results
            }, FixerOutput)
            
            val_data = result.dict() if hasattr(result, "dict") else result.model_dump()
            
            for fix in val_data['fixes']:
                db_field = fix['field_name_in_db']
                if hasattr(db_card, db_field):
                    val = fix['new_value']
                    setattr(db_card, db_field, val)
                    logger.info(f"Updated {db_field} for {db_card.card_name}")
            
            await session.commit()
            os.remove(filepath) # Remove the report since it's fixed
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error fixing {card_id_str}: {e}")

async def main():
    await init_db()
    reports_dir = os.path.join(os.path.dirname(__file__), "..", "reports")
    files = [os.path.join(reports_dir, f) for f in os.listdir(reports_dir) if f.endswith(".md")]
    
    sem = asyncio.Semaphore(5)
    async def bounded(f):
        async with sem:
            await fix_card(f)
            
    await asyncio.gather(*[bounded(f) for f in files])
    logger.info("Done fixing reports.")

if __name__ == "__main__":
    asyncio.run(main())
