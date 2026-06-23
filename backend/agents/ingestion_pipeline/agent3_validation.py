import os
import logging
from typing import List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy import select

from models.card_catalog import CardCatalog
from core.database import async_session_factory
from .state import IngestionState, ValidationReport, ValidationFailure
from .search import get_search_provider
from .llm import get_llm

logger = logging.getLogger(__name__)

class ValidatorFieldOutput(BaseModel):
    field: str = Field(description="The exact field name (e.g., Annual Fee, Fee Waiver, Reward Structure, Milestone Benefit, etc.)")
    status: str = Field(description="'PASS', 'PASS_WITH_FORMAT_DIFFERENCES', or 'FAIL'")
    expected: str = Field(description="The correct expected value/structure from official sources")
    found: str = Field(description="The value/structure found in the database")
    reason: str = Field(description="Explanation of the evaluation, especially if FAILED or FORMAT_DIFFERENCES")

class ValidatorOutput(BaseModel):
    overall_status: str = Field(description="'PASS', 'PASS_WITH_FORMAT_DIFFERENCES', or 'FAIL' based on overall evaluation")
    confidence: float = Field(description="Confidence score between 0.0 and 100.0")
    fields: List[ValidatorFieldOutput] = Field(description="List of all evaluated fields and their individual status")
    sources: List[str] = Field(default_factory=list, description="URLs of sources used to verify")

async def run_validation_agent(state: IngestionState) -> IngestionState:
    logger.info("Running Validation Agent")
    inserted_cards = state.get("inserted_cards", [])
    
    # We will also validate cards that were just "fixed" by agent 4
    # The fix agent updates the DB and keeps the card in `cards_to_fix` but clears it out
    # Actually, the graph logic handles passing the right cards. We'll just validate everything in `inserted_cards`
    # and any cards in `cards_to_fix` that we are re-validating.
    cards_to_validate = inserted_cards.copy()
    
    # If there are specific cards to fix being re-run, we might need to fetch them.
    # To keep it simple, we just read the DB for the given IDs and validate.
    
    search = get_search_provider()
    
    # Using LLM for validation
    # Using LLM for validation
    system_prompt = """You are a strictly independent QA Validation Agent for a credit card database.
Your job is to independently verify every field of the provided database record against official sources.
You MUST NOT trust the database values. You MUST NOT trust previous agent outputs.

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
        ("user", "Database Record to verify:\n{db_record}\n\nIndependent Search Results for Verification:\n{search_results}")
    ])
    
    from .llm import invoke_structured
    
    validation_reports = state.get("validation_reports", {})
    cards_to_fix = set(state.get("cards_to_fix", []))
    
    reports_dir = os.path.join(os.getcwd(), "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    async with async_session_factory() as session:
        for card_info in cards_to_validate:
            card_id_str = card_info["card_id"]
            
            # Fetch latest from DB
            stmt = select(CardCatalog).where(CardCatalog.id == UUID(card_id_str))
            db_res = await session.execute(stmt)
            db_card = db_res.scalars().first()
            
            if not db_card:
                continue
                
            db_record_str = f"Card: {db_card.card_name}, Bank: {db_card.bank_name}, Network: {db_card.network}, Joining: {db_card.joining_fee}, Annual: {db_card.annual_fee}, Waiver: {db_card.fee_waiver_spend_threshold}\nRewards: {db_card.reward_rules_json}\nMilestones: {db_card.milestones_json}"
            
            # Perform independent search
            query = f"{db_card.card_name} {db_card.bank_name} annual fee rewards lounge exclusions official"
            search_results = search.search(query)
            
            # Run validation
            result: ValidatorOutput = await invoke_structured(prompt, {
                "db_record": db_record_str,
                "search_results": search_results
            }, ValidatorOutput)
            
            if hasattr(result, "dict"):
                val_data = result.dict()
            else:
                val_data = result.model_dump()
            
            overall_status = val_data.get('overall_status', 'FAIL')
            
            # Generate markdown report
            report_md = f"# {db_card.card_name}\n\n"
            report_md += f"Status: {overall_status}\n\n"
            report_md += "## Validation Summary\n\n"
            
            failures = [f for f in val_data['fields'] if f['status'] == "FAIL"]
            
            for field_data in val_data['fields']:
                report_md += f"### {field_data['field']}\n"
                report_md += f"Status: {field_data['status']}\n"
                
                # If it's a multiline expected/found, render properly
                exp = str(field_data['expected'])
                fnd = str(field_data['found'])
                if '\n' in exp or '\n' in fnd:
                    report_md += f"Expected:\n{exp}\n\n"
                    report_md += f"Found:\n{fnd}\n\n"
                else:
                    report_md += f"Expected: {exp}\n"
                    report_md += f"Found: {fnd}\n\n"
            
            if failures:
                cards_to_fix.add(card_id_str)
                report_md += "## Errors\n"
                for failure in failures:
                    report_md += f"- {failure['field']}: {failure['reason']}\n"
                
                report_md += "\n## Recommended Fix\n"
                report_md += "Please apply the expected values to resolve the mismatches.\n\n"
            else:
                if card_id_str in cards_to_fix:
                    cards_to_fix.remove(card_id_str)
                if overall_status == "PASS_WITH_FORMAT_DIFFERENCES":
                    report_md += "All fields verified successfully (minor formatting differences ignored).\n\n"
                else:
                    report_md += "All fields verified successfully.\n\n"
            
            report_md += "## Sources\n"
            for src in val_data['sources']:
                report_md += f"- {src}\n"
            
            report_md += f"\n## Confidence\n{val_data['confidence']}%\n"
            
            # Write report
            report_path = os.path.join(reports_dir, f"card_validation_{card_id_str}.md")
            with open(report_path, "w") as f:
                f.write(report_md)
                
            validation_reports[card_id_str] = {
                "status": overall_status,
                "failures": failures,
                "markdown_content": report_md,
                "confidence": val_data["confidence"]
            }
            
    return {
        "validation_reports": validation_reports,
        "cards_to_fix": list(cards_to_fix)
    }
