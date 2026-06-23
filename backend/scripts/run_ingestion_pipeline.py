import asyncio
import logging
import sys
import os

# Add backend to path so we can import properly when run as script
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.database import init_db
from core.config import get_settings
from agents.ingestion_pipeline.graph import create_ingestion_graph
from agents.ingestion_pipeline.state import IngestionState

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    settings = get_settings()
    logger.info(f"Starting Ingestion Pipeline in {settings.environment} mode.")
    
    # Initialize DB (just in case tables are missing locally)
    await init_db()
    
    graph = create_ingestion_graph()
    
    # Initial state
    initial_state: IngestionState = {
        "existing_card_names": ["HDFC Millennia", "SBI Cashback", "Axis Ace"], # Example existing cards to avoid
        "discovered_cards": [],
        "inserted_cards": [],
        "validation_reports": {},
        "cards_to_fix": [],
        "fix_retries": {}
    }
    
    logger.info("Invoking Graph...")
    final_state = await graph.ainvoke(initial_state)
    
    logger.info("Pipeline Complete.")
    
    inserted = final_state.get("inserted_cards", [])
    logger.info(f"Total inserted cards: {len(inserted)}")
    
    failures = final_state.get("cards_to_fix", [])
    if failures:
        logger.warning(f"Cards still failing after max retries: {failures}")
    else:
        logger.info("All inserted cards passed validation!")

if __name__ == "__main__":
    asyncio.run(main())
