import asyncio
import logging
import sys
import os

# Add backend to path so we can import properly when run as script
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from core.database import init_db, async_session_factory
from core.config import get_settings
from agents.ingestion_pipeline.graph import create_ingestion_graph
from agents.ingestion_pipeline.state import IngestionState
from models.card_catalog import CardCatalog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TARGET_CARDS = [
    # Entry-Level & Cashback Cards
    "SBI Cashback", "Axis ACE", "Amazon Pay ICICI", "Flipkart Axis", "HDFC Millennia",
    "HSBC Live+", "Airtel Axis", "Swiggy HDFC", "Myntra Kotak", "Samsung Axis",
    
    # UPI-Linked RuPay Cards
    "Tata Neu Infinity HDFC", "Tata Neu Plus HDFC", "Kiwi Axis", "Jupiter Edge",
    "HDFC Digital RuPay", "ICICI Coral RuPay", "BOB Snapdeal RuPay", "Kotak League RuPay",
    "Yes Bank PaisaSave", "Pnb Select RuPay",
    
    # Travel & Co-Branded Cards
    "Axis Atlas", "SBI Elite", "HDFC Marriott Bonvoy", "Amex Platinum Travel",
    "IndiGo IDFC FIRST Dual", "Air India SBI Signature", "HSBC TravelOne",
    "Federal Scapia", "AU Ixigo", "BOB Etihad Premium",
    
    # Premium & Super-Premium Cards
    "HDFC Infinia", "HDFC Diners Club Black Metal", "Axis Magnus", "Axis Reserve",
    "Amex Platinum Charge", "ICICI Emeralde Private Metal", "IDFC FIRST Private",
    "Yes Bank Marquee", "Standard Chartered Ultimate", "HSBC Premier",
    
    # Fuel & Utility Cards
    "SBI BPCL Octane", "ICICI HPCL Super Saver", "HDFC IndianOil", "Axis IndianOil",
    "IDFC FIRST Power Plus", "Standard Chartered Super Value Titanium", "RBL IndianOil XTRA",
    "BOB HPCL Energie", "SBI SimplySAVE", "Kotak IndianOil",
    
    # Lifetime Free (LTF) Cards
    "IDFC FIRST Millennia", "IDFC FIRST Wealth", "HSBC Platinum", "ICICI Platinum Chip",
    "AU LIT", "IndusInd Legend", "IndusInd Tiger", "Federal Bank Signet", "IDFC FIRST Wow"
]

async def process_card(graph, card_name: str):
    logger.info(f"--- Starting Ingestion for: {card_name} ---")
    initial_state: IngestionState = {
        "existing_card_names": [],
        "target_card": card_name,
        "discovered_cards": [],
        "inserted_cards": [],
        "validation_reports": {},
        "cards_to_fix": [],
        "fix_retries": {}
    }
    
    try:
        final_state = await graph.ainvoke(initial_state)
        inserted = final_state.get("inserted_cards", [])
        failures = final_state.get("cards_to_fix", [])
        
        if inserted:
            logger.info(f"SUCCESS: Inserted {len(inserted)} card(s) for '{card_name}'.")
        else:
            logger.warning(f"No cards inserted for '{card_name}'.")
            
        if failures:
            logger.warning(f"Cards still failing after max retries for '{card_name}': {failures}")
        else:
            if inserted:
                logger.info(f"All inserted cards for '{card_name}' passed validation!")
    except Exception as e:
        logger.error(f"Error processing {card_name}: {e}")

async def main():
    settings = get_settings()
    logger.info(f"Starting Concurrent Batch Ingestion in {settings.environment} mode.")
    
    await init_db()
    
    # Pre-filter existing cards to save LLM calls
    async with async_session_factory() as session:
        result = await session.execute(select(CardCatalog.card_name))
        existing_names = [row.lower() for row in result.scalars().all()]

    filtered_targets = []
    for t in TARGET_CARDS:
        parts = t.lower().split()
        matched = False
        for e in existing_names:
            if sum(1 for p in parts if p in e) >= len(parts) * 0.8:
                matched = True
                break
        if not matched and t not in filtered_targets:
            filtered_targets.append(t)
    
    logger.info(f"Filtered {len(TARGET_CARDS)} targets down to {len(filtered_targets)} new cards.")
    
    graph = create_ingestion_graph()
    
    # Process up to 10 cards concurrently as requested
    sem = asyncio.Semaphore(10)
    
    async def bounded_process(card_name):
        async with sem:
            await process_card(graph, card_name)
            await asyncio.sleep(2) # Small delay between concurrent tasks
            
    tasks = [bounded_process(card_name) for card_name in filtered_targets]
    await asyncio.gather(*tasks)
        
    logger.info("Concurrent Batch Ingestion Complete.")

if __name__ == "__main__":
    asyncio.run(main())
