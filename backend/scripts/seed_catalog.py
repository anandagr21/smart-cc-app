import asyncio
import logging
from decimal import Decimal
from sqlalchemy import select

from core.database import async_session_factory
from cards.schemas import CardCatalogCreate
from models.card_catalog import CardCatalog
from services.card_service import CardCatalogService
from repositories.card_repository import CardCatalogRepository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_catalog")

# 15 Highly realistic Indian cards representing different tiers and reward types
CARDS_TO_SEED = [
    # --- Cashback Cards ---
    CardCatalogCreate(
        card_name="Cashback SBI Card",
        bank_name="SBI Card",
        network="Visa",
        joining_fee=Decimal("999.00"),
        annual_fee=Decimal("999.00"),
        is_active=True
    ),
    CardCatalogCreate(
        card_name="Amazon Pay ICICI Card",
        bank_name="ICICI Bank",
        network="Visa",
        joining_fee=Decimal("0.00"),
        annual_fee=Decimal("0.00"),
        is_active=True
    ),
    CardCatalogCreate(
        card_name="Axis Ace Credit Card",
        bank_name="Axis Bank",
        network="Visa",
        joining_fee=Decimal("499.00"),
        annual_fee=Decimal("499.00"),
        is_active=True
    ),
    CardCatalogCreate(
        card_name="HDFC Millennia Credit Card",
        bank_name="HDFC Bank",
        network="Mastercard",
        joining_fee=Decimal("1000.00"),
        annual_fee=Decimal("1000.00"),
        is_active=True
    ),

    # --- Travel Cards ---
    CardCatalogCreate(
        card_name="SBI Card PRIME",
        bank_name="SBI Card",
        network="Visa",
        joining_fee=Decimal("2999.00"),
        annual_fee=Decimal("2999.00"),
        is_active=True
    ),
    CardCatalogCreate(
        card_name="Axis Atlas Credit Card",
        bank_name="Axis Bank",
        network="Visa",
        joining_fee=Decimal("5000.00"),
        annual_fee=Decimal("5000.00"),
        is_active=True
    ),
    CardCatalogCreate(
        card_name="Amex Platinum Travel",
        bank_name="American Express",
        network="Amex",
        joining_fee=Decimal("3500.00"),
        annual_fee=Decimal("5000.00"),
        is_active=True
    ),

    # --- Premium & Lifestyle ---
    CardCatalogCreate(
        card_name="HDFC Infinia Metal Edition",
        bank_name="HDFC Bank",
        network="Visa",
        joining_fee=Decimal("12500.00"),
        annual_fee=Decimal("12500.00"),
        is_active=True
    ),
    CardCatalogCreate(
        card_name="HDFC Regalia Gold",
        bank_name="HDFC Bank",
        network="Visa",
        joining_fee=Decimal("2500.00"),
        annual_fee=Decimal("2500.00"),
        is_active=True
    ),
    CardCatalogCreate(
        card_name="Amex Platinum Reserve",
        bank_name="American Express",
        network="Amex",
        joining_fee=Decimal("10000.00"),
        annual_fee=Decimal("10000.00"),
        is_active=True
    ),
    CardCatalogCreate(
        card_name="ICICI Emeralde Credit Card",
        bank_name="ICICI Bank",
        network="Mastercard",
        joining_fee=Decimal("12000.00"),
        annual_fee=Decimal("12000.00"),
        is_active=True
    ),

    # --- Beginner/Core ---
    CardCatalogCreate(
        card_name="SBI SimplyCLICK",
        bank_name="SBI Card",
        network="Visa",
        joining_fee=Decimal("499.00"),
        annual_fee=Decimal("499.00"),
        base_point_value=Decimal("0.25"),
        is_active=True
    ),
    CardCatalogCreate(
        card_name="ICICI Coral Credit Card",
        bank_name="ICICI Bank",
        network="Visa",
        joining_fee=Decimal("500.00"),
        annual_fee=Decimal("500.00"),
        is_active=True
    ),
    CardCatalogCreate(
        card_name="Kotak Zen Signature",
        bank_name="Kotak Mahindra Bank",
        network="Visa",
        joining_fee=Decimal("1500.00"),
        annual_fee=Decimal("1500.00"),
        is_active=True
    ),
    CardCatalogCreate(
        card_name="Amex MRCC",
        bank_name="American Express",
        network="Amex",
        joining_fee=Decimal("1000.00"),
        annual_fee=Decimal("4500.00"),
        is_active=True
    )
]

async def seed_catalog():
    """Idempotently seed the master card catalog."""
    logger.info("Starting master card catalog seed...")
    
    async with async_session_factory() as session:
        repo = CardCatalogRepository(session)
        service = CardCatalogService(repo)
        
        inserted = 0
        skipped = 0

        for card_data in CARDS_TO_SEED:
            # Check for idempotency: does a card with this name and bank exist?
            stmt = select(CardCatalog).where(
                CardCatalog.card_name == card_data.card_name,
                CardCatalog.bank_name == card_data.bank_name
            )
            existing = await session.execute(stmt)
            if existing.scalar_one_or_none():
                skipped += 1
                logger.debug(f"Skipped existing card: {card_data.card_name}")
                continue
            
            # Create if missing
            await service.create_card(card_data)
            inserted += 1
            logger.info(f"Seeded: {card_data.card_name} ({card_data.network})")
            
        await session.commit()
        logger.info(f"Seed complete. Inserted: {inserted}. Skipped: {skipped}.")

if __name__ == "__main__":
    asyncio.run(seed_catalog())
