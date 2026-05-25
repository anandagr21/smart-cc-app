import asyncio
import logging
from sqlalchemy import select

from core.database import async_session_factory
from models.card_catalog import CardCatalog
from rewards.models import RewardRule
from rewards.constants import RewardRuleType
from uuid import UUID

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_rules")

async def seed_rules():
    logger.info("Starting reward rules seed...")
    
    async with async_session_factory() as session:
        # Get all catalog cards
        stmt = select(CardCatalog)
        result = await session.execute(stmt)
        cards = result.scalars().all()
        
        inserted = 0
        skipped = 0
        
        for card in cards:
            card_id_str = str(card.id)
            # Check if rules already exist for this card
            rule_stmt = select(RewardRule).where(RewardRule.card_id == card_id_str)
            existing_rules = (await session.execute(rule_stmt)).scalars().all()
            if existing_rules:
                skipped += len(existing_rules)
                logger.debug(f"Skipped existing rules for card: {card.card_name}")
                continue
                
            rules_to_insert = []
            
            # --- SBI Cashback ---
            if "Cashback SBI" in card.card_name:
                rules_to_insert.extend([
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="5% Online Cashback",
                        rule_type=RewardRuleType.CASHBACK,
                        priority=10,
                        is_active=True,
                        rule_config={
                            "reward_rate": 0.05,
                            "payment_mode": "online",
                            "cap": 5000,
                            "period": "monthly"
                        }
                    ),
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="1% Offline Cashback",
                        rule_type=RewardRuleType.CASHBACK,
                        priority=100,
                        is_active=True,
                        rule_config={
                            "reward_rate": 0.01
                        }
                    )
                ])
                
            # --- Amazon Pay ICICI ---
            elif "Amazon Pay" in card.card_name:
                rules_to_insert.extend([
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="5% Amazon Prime Cashback",
                        rule_type=RewardRuleType.MERCHANT_BONUS,
                        priority=10,
                        is_active=True,
                        rule_config={
                            "merchant": "amazon",
                            "reward_rate": 0.05
                        }
                    ),
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="1% Base Cashback",
                        rule_type=RewardRuleType.CASHBACK,
                        priority=100,
                        is_active=True,
                        rule_config={
                            "reward_rate": 0.01
                        }
                    )
                ])
                
            # --- Axis Ace ---
            elif "Axis Ace" in card.card_name:
                rules_to_insert.extend([
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="5% Utility & Bill Pay",
                        rule_type=RewardRuleType.CATEGORY_BONUS,
                        priority=10,
                        is_active=True,
                        rule_config={
                            "category": "utilities",
                            "reward_rate": 0.05
                        }
                    ),
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="4% Swiggy/Zomato/Ola",
                        rule_type=RewardRuleType.MERCHANT_BONUS,
                        priority=20,
                        is_active=True,
                        rule_config={
                            "merchant": "swiggy",
                            "reward_rate": 0.04
                        }
                    ),
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="4% Swiggy/Zomato/Ola",
                        rule_type=RewardRuleType.MERCHANT_BONUS,
                        priority=20,
                        is_active=True,
                        rule_config={
                            "merchant": "zomato",
                            "reward_rate": 0.04
                        }
                    ),
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="2% Base Cashback",
                        rule_type=RewardRuleType.CASHBACK,
                        priority=100,
                        is_active=True,
                        rule_config={
                            "reward_rate": 0.02
                        }
                    )
                ])
                
            # --- Millennia ---
            elif "Millennia" in card.card_name:
                rules_to_insert.extend([
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="5% Amazon/Flipkart/Myntra",
                        rule_type=RewardRuleType.MERCHANT_BONUS,
                        priority=10,
                        is_active=True,
                        rule_config={
                            "merchant": "amazon",
                            "reward_rate": 0.05
                        }
                    ),
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="5% Amazon/Flipkart/Myntra",
                        rule_type=RewardRuleType.MERCHANT_BONUS,
                        priority=10,
                        is_active=True,
                        rule_config={
                            "merchant": "flipkart",
                            "reward_rate": 0.05
                        }
                    ),
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="1% Base Cashback",
                        rule_type=RewardRuleType.CASHBACK,
                        priority=100,
                        is_active=True,
                        rule_config={
                            "reward_rate": 0.01
                        }
                    )
                ])

            # --- Swiggy HDFC --- (if added later, or map dining)
            # Default for anything else
            else:
                rules_to_insert.extend([
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="Standard Reward Points",
                        rule_type=RewardRuleType.REWARD_POINTS,
                        priority=100,
                        is_active=True,
                        rule_config={
                            "reward_rate": 0.015, # 1.5% equivalent
                            "points_multiplier": 1,
                            "points_per_unit": 2,
                            "spend_unit": 100,
                            "rupee_value": 0.25
                        }
                    ),
                    RewardRule(
                        card_id=card_id_str,
                        rule_name="Dining Bonus",
                        rule_type=RewardRuleType.CATEGORY_BONUS,
                        priority=50,
                        is_active=True,
                        rule_config={
                            "category": "dining",
                            "reward_rate": 0.05, # 5% equivalent
                            "points_multiplier": 1,
                            "points_per_unit": 10,
                            "spend_unit": 100,
                            "rupee_value": 0.25
                        }
                    )
                ])
                
            session.add_all(rules_to_insert)
            inserted += len(rules_to_insert)
            logger.info(f"Seeded {len(rules_to_insert)} rules for {card.card_name}")
            
        await session.commit()
        logger.info(f"Seed complete. Inserted: {inserted}. Skipped: {skipped}.")

if __name__ == "__main__":
    asyncio.run(seed_rules())
