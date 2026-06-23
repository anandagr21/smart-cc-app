import asyncio
import os
import sys
import logging
from uuid import UUID

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from core.database import async_session_factory, init_db
from models.card_catalog import CardCatalog
from agents.ingestion_pipeline.agent3_validation import ValidatorOutput
from agents.ingestion_pipeline.llm import invoke_structured
from langchain_core.prompts import ChatPromptTemplate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

system_prompt = """You are a strictly independent QA Validation Agent.
You are given an OLD validation report for a credit card. Your task is to re-evaluate the findings using updated Semantic Business Rules.

# Core Principle
Validate semantic correctness and actual business rules rather than string equality. Formatting differences alone must never produce a validation failure.

# Validation States
Use exactly one of these states for the overall status:
1. PASS - Business values match perfectly.
2. PASS_WITH_FORMAT_DIFFERENCES - Business values match, but formatting differs (e.g., numeric vs textual, "₹1,499 + GST" vs "1499", different currency symbols, trailing zeros).
3. FAIL - Actual business rule differs, missing a cap, missing an exclusion, incorrect fee, incorrect reward rate, missing milestone, or missing lounge rule.

# Rules per field:
- Annual/Joining Fee: Ignore GST mentions, taxes, currency symbols, commas. (e.g., "₹1499 + GST" equals "1499")
- Fee Waiver: Compare the actual spend target and period. Ignore numeric vs textual differences.
- Milestone Benefits: Ensure the spend target and the reward points/items match semantically.
- Reward Rules: Must structurally validate the multiplier AND any caps (e.g., max 2500 points per cycle). Missing a cap is a FAIL.
- Lounge/Fuel/Exclusions: Ensure the business rule logic matches.

If status is FAIL, you MUST list the failures. If status is PASS or PASS_WITH_FORMAT_DIFFERENCES, failures should be an empty list.
"""

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("user", "Card Name: {card_name}\n\nOld Report:\n{old_report}")
])

async def process_report(filepath: str):
    filename = os.path.basename(filepath)
    card_id_str = filename.replace("card_validation_", "").replace(".md", "")
    
    with open(filepath, "r") as f:
        old_report = f.read()
        
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
            
    logger.info(f"Re-evaluating {db_card.card_name}")
    
    try:
        result: ValidatorOutput = await invoke_structured(prompt, {
            "card_name": db_card.card_name,
            "old_report": old_report
        }, ValidatorOutput)
        
        val_data = result.dict() if hasattr(result, "dict") else result.model_dump()
        overall_status = val_data.get('overall_status', 'FAIL')
        
        # Generate markdown report
        report_md = f"# {db_card.card_name}\n\n"
        report_md += f"Status: {overall_status}\n\n"
        report_md += "## Validation Summary\n\n"
        
        failures = [f for f in val_data['fields'] if f['status'] == "FAIL"]
        
        for field_data in val_data['fields']:
            report_md += f"### {field_data['field']}\n"
            report_md += f"Status: {field_data['status']}\n"
            
            exp = str(field_data['expected'])
            fnd = str(field_data['found'])
            if '\n' in exp or '\n' in fnd:
                report_md += f"Expected:\n{exp}\n\n"
                report_md += f"Found:\n{fnd}\n\n"
            else:
                report_md += f"Expected: {exp}\n"
                report_md += f"Found: {fnd}\n\n"
        
        if failures:
            report_md += "## Errors\n"
            for failure in failures:
                report_md += f"- {failure['field']}: {failure['reason']}\n"
            report_md += "\n## Recommended Fix\n"
            report_md += "Please apply the expected values to resolve the mismatches.\n\n"
        else:
            if overall_status == "PASS_WITH_FORMAT_DIFFERENCES":
                report_md += "All fields verified successfully (minor formatting differences ignored).\n\n"
            else:
                report_md += "All fields verified successfully.\n\n"
                
        report_md += "## Sources\n"
        for src in val_data.get('sources', []):
            report_md += f"- {src}\n"
            
        report_md += f"\n## Confidence\n{val_data.get('confidence', 95.0)}%\n"
        
        with open(filepath, "w") as f:
            f.write(report_md)
    except Exception as e:
        logger.error(f"Error evaluating {card_id_str}: {e}")

async def main():
    await init_db()
    reports_dir = os.path.join(os.path.dirname(__file__), "..", "reports")
    files = [os.path.join(reports_dir, f) for f in os.listdir(reports_dir) if f.endswith(".md")]
    
    sem = asyncio.Semaphore(5)
    async def bounded(f):
        async with sem:
            await process_report(f)
            
    await asyncio.gather(*[bounded(f) for f in files])
    logger.info("Done revalidating reports.")

if __name__ == "__main__":
    asyncio.run(main())
