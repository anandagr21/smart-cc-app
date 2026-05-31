import asyncio
from sqlmodel import select
from core.database import async_session_factory
from card_intelligence.models import CardExtractionCandidate
from card_intelligence.service import CardIntelligenceService
from recommendations.orchestrator import RecommendationOrchestrator
from recommendations.schemas import RecommendationRequest
from merchants.service import MerchantService
from services.card_service import UserCardService
from rewards.service import RewardRuleService
import uuid

async def publish_and_test():
    async with async_session_factory() as db:
        service = CardIntelligenceService(db)
        
        # 1. Get all pending candidates
        stmt = select(CardExtractionCandidate).where(CardExtractionCandidate.status == "PENDING_REVIEW")
        result = await db.execute(stmt)
        candidates = result.scalars().all()
        
        print(f"Found {len(candidates)} pending candidates.")
        
        candidate_ids = [str(c.id) for c in candidates]
        dummy_user_id = uuid.uuid4()
        
        if candidate_ids:
            print("Publishing candidates...")
            try:
                published_rules = await service.publish_candidates(candidate_ids, dummy_user_id)
                print(f"Published {len(published_rules)} rules.")
            except Exception as e:
                print(f"Error publishing: {e}")
        
        # 2. Setup Orchestrator
        merchant_service = MerchantService(db)
        user_card_service = UserCardService(db)
        reward_rule_service = RewardRuleService(db)
        
        orchestrator = RecommendationOrchestrator(
            merchant_service=merchant_service,
            user_card_service=user_card_service,
            reward_rule_service=reward_rule_service
        )
        
        # We need a user who actually HAS the SimplyClick card in their wallet.
        # Let's get the first user who has a card.
        from models.user_card import UserCard
        stmt = select(UserCard).limit(1)
        result = await db.execute(stmt)
        user_card = result.scalars().first()
        
        if not user_card:
            print("No users with cards found in DB to test the optimizer.")
            return
            
        real_user_id = user_card.user_id
        print(f"\nTesting Optimizer for user {real_user_id}...")
        
        # Test Case 1: Swiggy
        print("\nTest Case 1: Swiggy - 1000 Rs")
        req_swiggy = RecommendationRequest(
            merchant_name="Swiggy",
            amount=1000,
            intent="MAX_REWARDS"
        )
        resp_swiggy = await orchestrator.generate_recommendation(real_user_id, req_swiggy)
        print(f"Normalized Merchant: {resp_swiggy.normalized_merchant} | Category: {resp_swiggy.category}")
        for rc in resp_swiggy.all_ranked_cards:
            print(f"Card: {rc.card_name} -> Score: {rc.optimization_score} (Reward: {rc.immediate_reward_value}) | Reason: {rc.reason_codes}")

        # Test Case 2: Uber
        print("\nTest Case 2: Uber - 1000 Rs")
        req_uber = RecommendationRequest(
            merchant_name="Uber",
            amount=1000,
            intent="MAX_REWARDS"
        )
        resp_uber = await orchestrator.generate_recommendation(real_user_id, req_uber)
        print(f"Normalized Merchant: {resp_uber.normalized_merchant} | Category: {resp_uber.category}")
        for rc in resp_uber.all_ranked_cards:
            print(f"Card: {rc.card_name} -> Score: {rc.optimization_score} (Reward: {rc.immediate_reward_value}) | Reason: {rc.reason_codes}")

        # Test Case 3: Amazon
        print("\nTest Case 3: Amazon - 5000 Rs")
        req_amazon = RecommendationRequest(
            merchant_name="Amazon India Pvt Ltd",
            amount=5000,
            intent="MAX_REWARDS"
        )
        resp_amazon = await orchestrator.generate_recommendation(real_user_id, req_amazon)
        print(f"Normalized Merchant: {resp_amazon.normalized_merchant} | Category: {resp_amazon.category}")
        for rc in resp_amazon.all_ranked_cards:
            print(f"Card: {rc.card_name} -> Score: {rc.optimization_score} (Reward: {rc.immediate_reward_value}) | Reason: {rc.reason_codes}")

if __name__ == "__main__":
    asyncio.run(publish_and_test())
