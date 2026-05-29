import asyncio
from sqlmodel.ext.asyncio.session import AsyncSession
from core.database import engine
from sqlmodel import select
from models.card_catalog import CardCatalog
from card_intelligence.models import CardKnowledgeSource, CardExtractionCandidate, CandidateType, CandidateStatus

async def seed():
    async with AsyncSession(engine) as db:
        # Get a card
        result = await db.execute(select(CardCatalog))
        card = result.scalars().first()
        if not card:
            print("No cards found.")
            return
        card_id = card.id

        # Get a knowledge source
        result = await db.execute(select(CardKnowledgeSource).where(CardKnowledgeSource.card_id == card_id))
        source = result.scalars().first()
        if not source:
            print("No sources found. Creating a fake source...")
            source = CardKnowledgeSource(
                card_id=card_id,
                source_type="URL",
                source_url="https://fake.url/mitc",
                source_title="Fake MITC",
                processing_status="COMPLETED"
            )
            db.add(source)
            await db.commit()
            await db.refresh(source)
        source_id = source.id

        # Check if already seeded
        result = await db.execute(select(CardExtractionCandidate).where(CardExtractionCandidate.card_id == card_id))
        if len(result.scalars().all()) > 0:
            print("Already seeded.")
            return

        print(f"Seeding candidates for card {card_id} and source {source_id}")

        candidates = [
            CardExtractionCandidate(
                card_id=card_id,
                candidate_type=CandidateType.FEE_RULE,
                entity_identifier="ANNUAL_FEE",
                field_name="annual_fee",
                current_value={"value": 499},
                proposed_value={"value": 999},
                confidence_score=0.97,
                source_id=source_id,
                source_page=3,
                source_text="The annual membership fee shall be ₹999 plus taxes.",
                status=CandidateStatus.PENDING_REVIEW
            ),
            CardExtractionCandidate(
                card_id=card_id,
                candidate_type=CandidateType.REWARD_RULE,
                entity_identifier="SWIGGY",
                field_name="cashback_rate",
                current_value=None,
                proposed_value={"rate": 0.10, "cap": 1500},
                confidence_score=0.88,
                source_id=source_id,
                source_page=5,
                source_text="Enjoy a massive 10% cashback on Swiggy up to ₹1500 per month.",
                status=CandidateStatus.PENDING_REVIEW
            ),
            CardExtractionCandidate(
                card_id=card_id,
                candidate_type=CandidateType.BENEFIT,
                entity_identifier="LOUNGE_DOMESTIC",
                field_name="visits_per_quarter",
                current_value={"visits": 1},
                proposed_value={"visits": 2},
                confidence_score=0.92,
                source_id=source_id,
                source_page=7,
                source_text="Cardholders are entitled to 2 complimentary domestic lounge visits every quarter.",
                status=CandidateStatus.PENDING_REVIEW
            )
        ]

        for c in candidates:
            db.add(c)
        await db.commit()
        print("Successfully seeded candidates.")

if __name__ == "__main__":
    asyncio.run(seed())
