
from uuid import UUID

from insights.enrichment.transaction_enrichment import TransactionEnrichmentService
from insights.generators.fee_waiver import FeeWaiverGenerator
from insights.generators.missed_rewards import MissedRewardsGenerator
from insights.generators.underutilized_cards import UnderutilizedCardGenerator
from insights.generators.portfolio_optimization import PortfolioOptimizationGenerator
from insights.prioritization.prioritization_engine import PrioritizationEngine
from insights.schemas import InsightResponse
from insights.suppression.cooldown_engine import CooldownEngine

from services.card_service import UserCardService
from transactions.service import TransactionService

class InsightOrchestrator:
    def __init__(
        self,
        card_service: UserCardService,
        transaction_service: TransactionService,
        enrichment_service: TransactionEnrichmentService,
        cooldown_engine: CooldownEngine,
        missed_rewards_gen: MissedRewardsGenerator,
    ):
        self.card_service = card_service
        self.transaction_service = transaction_service
        self.enrichment_service = enrichment_service
        self.cooldown_engine = cooldown_engine
        
        # Instantiate pure generators
        self.fee_waiver_gen = FeeWaiverGenerator()
        self.underutilized_gen = UnderutilizedCardGenerator()
        self.portfolio_gen = PortfolioOptimizationGenerator()
        
        # Dependency injected generators
        self.missed_rewards_gen = missed_rewards_gen

    async def generate_user_insights(self, user_id: UUID) -> list[InsightResponse]:
        """
        End-to-end orchestration pipeline for intelligence generation.
        """
        # 1. Fetch user state — use raw ORM models so generators can access card_catalog
        cards = await self.card_service.fetch_raw_cards(user_id, skip=0, limit=100)
        
        # We need raw transactions to enrich them
        raw_transactions = await self.transaction_service.fetch_raw_transactions(user_id, skip=0, limit=200)
        
        # 2. Enrich transactions
        enriched_txns = await self.enrichment_service.enrich_transactions(raw_transactions)
        
        # 3. Execute Generators
        insights: list[InsightResponse] = []
        
        # Sync generators
        insights.extend(self.fee_waiver_gen.generate(str(user_id), cards, enriched_txns))
        insights.extend(self.underutilized_gen.generate(str(user_id), cards, enriched_txns))
        insights.extend(self.portfolio_gen.generate(str(user_id), cards, enriched_txns))
        
        # Async generators
        mr_insights = await self.missed_rewards_gen.generate_async(str(user_id), cards, enriched_txns)
        insights.extend(mr_insights)
        
        # 4. Suppression / Cooldown filtering
        active_insights = await self.cooldown_engine.filter_suppressed(str(user_id), insights)
        
        # 5. Prioritization
        ranked_insights = PrioritizationEngine.rank_insights(active_insights)
        
        return ranked_insights

    async def mark_insight_shown(self, user_id: UUID, insight_hash: str, insights: list[InsightResponse]):
        insight = next((i for i in insights if i.insight_hash == insight_hash), None)
        if insight:
            await self.cooldown_engine.record_shown(str(user_id), insight)
            
    async def dismiss_insight(self, user_id: UUID, insight_hash: str):
        await self.cooldown_engine.record_dismissed(str(user_id), insight_hash)
