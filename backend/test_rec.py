import asyncio
from uuid import UUID
from core.database import async_session_factory
from recommendations.orchestrator import RecommendationOrchestrator
from merchants.service import MerchantService
from services.card_service import UserCardService
from rewards.service import RewardRuleService
from recommendations.schemas import RecommendationRequest, OptimizationIntent

async def test_engine():
    async with async_session_factory() as db:
        merchant_service = MerchantService(db)
        user_card_service = UserCardService(db)
        reward_rule_service = RewardRuleService(db)
        
        orchestrator = RecommendationOrchestrator(
            merchant_service=merchant_service,
            user_card_service=user_card_service,
            reward_rule_service=reward_rule_service
        )
        
        # We need a user ID. Let's query the first user.
        from models.user import User
        from sqlalchemy import select
        user = (await db.execute(select(User))).scalars().first()
        if not user:
            print("No users found.")
            return

        request = RecommendationRequest(
            merchant_name="Amazon",
            amount=10000,
            payment_mode="online",
            intent=OptimizationIntent.MAX_REWARD
        )
        
        response = await orchestrator.generate_recommendation(user.id, request)
        print("Canonical Merchant:", response.normalized_merchant)
        print("Category:", response.category)
        print("\nAll Ranked Cards:")
        for c in response.all_ranked_cards:
            print(f"Card: {c.card_name}")
            print(f"  Immediate Reward: {c.immediate_reward_value}")
            print(f"  Reward Type: {c.reward_type}")
            print(f"  Cashback Amount: {c.cashback_amount}")
            print(f"  Reward Points: {c.reward_points}")
            print(f"  Explanations: {c.engine_explanations}")

if __name__ == "__main__":
    asyncio.run(test_engine())
