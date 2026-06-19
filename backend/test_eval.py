import asyncio
import os
import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import select
from core.database import async_session_factory
from models.card_catalog import CardCatalog
from recommendations.utils import parse_rules_from_catalog
from reward_engine.schemas import TransactionContext
from reward_engine.evaluator import evaluate as engine_evaluate

async def main():
    async with async_session_factory() as db:
        result = await db.execute(select(CardCatalog))
        cards = result.scalars().all()
        
    txn = TransactionContext(
        merchant="amazon",
        category="ecommerce",
        amount=5000,
        payment_mode="online",
        transaction_date="2026-06-19",
        is_online=True,
        mcc_code="5411",
        cumulative_spend=0
    )
    for card in cards:
        rules = parse_rules_from_catalog(card, card.card_name)
        if not rules:
            print(f"Card: {card.card_name} -> No rules")
            continue
        res = engine_evaluate(txn, rules)
        print(f"Card: {card.card_name} -> INR: {res.effective_reward_inr} | rule: {res.matched_rule.rule_name if res.matched_rule else 'None'} | value: {getattr(card, 'base_point_value', 'N/A')}")

asyncio.run(main())
