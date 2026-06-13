import asyncio
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import async_session_factory
from models.card_catalog import CardCatalog
from models.ingestion import SourceDocument, BenchmarkDataset, ExtractionBenchmark

TARGET_CARDS = [
    "SBI Cashback",
    "HDFC Millennia",
    "Axis Atlas",
    "Amex MRCC",
    "HDFC Infinia",
    "ICICI Sapphiro",
    "HSBC Live+",
    "Axis Ace",
    "AU Ixigo",
    "Standard Chartered Smart",
    "IDFC Wealth",
    "Yes Marquee"
]

FIELDS = ["annual_fee", "joining_fee", "renewal_fee"]

async def seed_dataset():
    async with async_session_factory() as db:
        # Create or get Dataset V1
        stmt = select(BenchmarkDataset).where(BenchmarkDataset.name == "Dataset V1 (Fees)")
        result = await db.execute(stmt)
        dataset = result.scalar_one_or_none()
        
        if not dataset:
            dataset = BenchmarkDataset(
                name="Dataset V1 (Fees)",
                status="DRAFT",
                dataset_type="GOLD_STANDARD"
            )
            db.add(dataset)
            await db.commit()
            await db.refresh(dataset)
            print(f"Created Dataset V1: {dataset.id}")
            
        added = 0
        
        for card_name in TARGET_CARDS:
            # Try to find card (case insensitive or partial match)
            stmt = select(CardCatalog).where(CardCatalog.card_name.ilike(f"%{card_name}%"))
            result = await db.execute(stmt)
            card = result.scalars().first()
            
            if not card:
                print(f"Card not found in DB: {card_name}")
                continue
                
            # Find latest source document
            stmt = select(SourceDocument).where(SourceDocument.card_catalog_id == card.id).order_by(SourceDocument.uploaded_at.desc())
            result = await db.execute(stmt)
            doc = result.scalars().first()
            
            if not doc:
                print(f"No SourceDocument for card: {card_name}")
                continue
                
            # Create benchmarks for the 3 fee types
            for field in FIELDS:
                # check if already exists
                stmt = select(ExtractionBenchmark).where(
                    ExtractionBenchmark.dataset_id == dataset.id,
                    ExtractionBenchmark.document_id == doc.id,
                    ExtractionBenchmark.field_name == field
                )
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()
                
                if not existing:
                    benchmark = ExtractionBenchmark(
                        dataset_id=dataset.id,
                        document_id=doc.id,
                        field_name=field,
                        expected_value={},  # Empty dict for now, to be manually populated by admin or auto-filled
                        verified_by_admin=False
                    )
                    db.add(benchmark)
                    added += 1
                    
        await db.commit()
        print(f"Added {added} benchmarks to Dataset V1.")

if __name__ == "__main__":
    asyncio.run(seed_dataset())
