from uuid import UUID
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import logging

from models.card_catalog import CardCatalog

logger = logging.getLogger(__name__)

class CardIntelligenceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def find_or_create_card(self, bank_name: str, card_name: str) -> UUID:
        normalized_key = f"{bank_name.strip().lower()}_{card_name.strip().lower()}".replace(" ", "_")
        
        stmt = select(CardCatalog).where(CardCatalog.normalized_card_key == normalized_key)
        result = await self.db.execute(stmt)
        card = result.scalars().first()
        
        if not card:
            # Create the card
            card = CardCatalog(
                bank_name=bank_name.strip(),
                card_name=card_name.strip(),
                normalized_card_key=normalized_key,
                network="N/A",  # Default network, since we don't capture it yet
                is_active=True
            )
            self.db.add(card)
            await self.db.commit()
            await self.db.refresh(card)
            logger.info(f"Created new CardCatalog entry: {bank_name} {card_name}")
            
        return card.id
