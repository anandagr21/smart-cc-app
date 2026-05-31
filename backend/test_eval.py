import sys
import os
import json
import uuid
from decimal import Decimal

# Add backend dir to path
sys.path.append("/Users/anandagrawal/work/smart-cc-app/backend")

from core.database import engine
from sqlmodel.ext.asyncio.session import AsyncSession
import asyncio

async def main():
    async with AsyncSession(engine) as session:
        # Fetch rules for SimplyCLICK (card id: 5c2ea97a-8e5a-4fe4-bdf8-f814e8d73d42)
        card_id_str = '5c2ea97a-8e5a-4fe4-bdf8-f814e8d73d42'
        result = await session.execute(select(RewardRule).where(RewardRule.card_id == card_id_str, RewardRule.is_active == True))
        rules = result.scalars().all()
        
        normalized_rules = [
            NormalizedRuleConfig(
                rule_name=r.rule_name,
                rule_type=r.rule_type,
                priority=r.priority,
                config=r.rule_config,
            )
            for r in rules
        ]

        context = TransactionContext(
            merchant_name="swiggy",
            category="food delivery",
            amount=Decimal("1000.00"),
            intent="online",
            is_international=False
        )
        
        result = evaluate(context, normalized_rules)
        print("--- SWIGGY 1000 ONLINE ---")
        print(json.dumps(result.model_dump(), indent=2, default=str))

asyncio.run(main())
