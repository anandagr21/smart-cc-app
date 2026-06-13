import asyncio
import os
import sys
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import async_session_factory
from services.ai_extraction import extract_single_field

async def main():
    document_id = "80db8654-f747-4673-86ac-2f7a4e75663a"
    async with async_session_factory() as db:
        for field_name in ["joining_fee", "renewal_fee", "fee_waiver_spend", "welcome_bonus"]:
            print(f"\n======================================")
            print(f"Extracting {field_name} for doc {document_id}")
            candidate = await extract_single_field(db, document_id, field_name)
        
        print("Status:", candidate.status)
        print("Value:", candidate.candidate_value)
        print("Explanation:", candidate.explanation)
        print("Rank:", candidate.retrieval_rank)
        print("Score:", candidate.retrieval_score)
        print("Source Chunk ID:", candidate.source_chunk_id)

if __name__ == "__main__":
    asyncio.run(main())
