from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from core.database import get_db
from insights.enrichment.transaction_enrichment import TransactionEnrichmentService
from insights.generators.missed_rewards import MissedRewardsGenerator
from insights.orchestrator import InsightOrchestrator
from insights.schemas import InsightResponse
from insights.suppression.cooldown_engine import CooldownEngine
from merchants.repository import AliasRepository, MerchantRepository
from merchants.service import MerchantService
from recommendations.orchestrator import RecommendationOrchestrator
from recommendations.service import RecommendationService
from rewards.service import RewardRuleService
from services.card_service import UserCardService
from transactions.repository import TransactionRepository
from transactions.service import TransactionService

router = APIRouter(prefix="/insights", tags=["insights"])

def get_insight_orchestrator(
    db: AsyncSession = Depends(get_db)
) -> InsightOrchestrator:
    # Build dependencies
    merchant_repo = MerchantRepository(db)
    alias_repo = AliasRepository(db)
    merchant_service = MerchantService(merchant_repo, alias_repo)
    
    card_service = UserCardService(db)
    tx_repo = TransactionRepository(db)
    tx_service = TransactionService(tx_repo)
    
    enrichment_service = TransactionEnrichmentService(merchant_service)
    cooldown_engine = CooldownEngine(db)
    
    # Recommendation dependencies for Missed Rewards
    reward_rule_service = RewardRuleService(db)
    rec_orch = RecommendationOrchestrator(merchant_service, card_service, reward_rule_service)
    rec_service = RecommendationService(rec_orch)
    missed_rewards_gen = MissedRewardsGenerator(rec_service)
    
    return InsightOrchestrator(
        card_service=card_service,
        transaction_service=tx_service,
        enrichment_service=enrichment_service,
        cooldown_engine=cooldown_engine,
        missed_rewards_gen=missed_rewards_gen
    )

@router.get("/", response_model=List[InsightResponse])
async def get_insights(
    current_user: UserResponse = Depends(get_current_user),
    orchestrator: InsightOrchestrator = Depends(get_insight_orchestrator)
):
    """
    Fetch the deterministic, behavior-aware insights for the user's wallet.
    Only returns insights that are not suppressed by cooldowns.
    """
    return await orchestrator.generate_user_insights(current_user.id)

@router.post("/{insight_hash}/dismiss")
async def dismiss_insight(
    insight_hash: str,
    current_user: UserResponse = Depends(get_current_user),
    orchestrator: InsightOrchestrator = Depends(get_insight_orchestrator)
):
    """
    Explicitly dismiss an insight so it doesn't show up again.
    """
    await orchestrator.dismiss_insight(current_user.id, insight_hash)
    return {"status": "dismissed"}

@router.post("/{insight_hash}/shown")
async def mark_insight_shown(
    insight_hash: str,
    current_user: UserResponse = Depends(get_current_user),
    orchestrator: InsightOrchestrator = Depends(get_insight_orchestrator)
):
    """
    Record that an insight was displayed, triggering its cooldown.
    """
    from datetime import datetime, timezone, timedelta
    from models.insight_suppression import InsightSuppression
    from sqlalchemy import select
    
    now = datetime.now(timezone.utc)
    stmt = select(InsightSuppression).where(
        InsightSuppression.user_id == current_user.id,
        InsightSuppression.insight_hash == insight_hash
    )
    result = await orchestrator.cooldown_engine.db.execute(stmt)
    suppression = result.scalars().first()
    
    if suppression:
        suppression.last_shown_at = now
        suppression.cooldown_expires_at = now + timedelta(days=1)
        suppression.is_dismissed = False
    else:
        suppression = InsightSuppression(
            user_id=current_user.id,
            insight_category="UNKNOWN",
            insight_hash=insight_hash,
            last_shown_at=now,
            cooldown_expires_at=now + timedelta(days=1)
        )
        orchestrator.cooldown_engine.db.add(suppression)
    await orchestrator.cooldown_engine.db.commit()
    return {"status": "shown"}
