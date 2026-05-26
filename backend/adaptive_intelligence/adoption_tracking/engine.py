from typing import List
from uuid import UUID
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select, and_, func

from models.transaction_optimization import TransactionOptimizationRecord, AdoptionStatus
from transactions.models import Transaction
from ..schemas import AdoptionMetrics

class RecommendationAdoptionEngine:
    """
    Tracks whether users actually follow optimization recommendations.
    Provides longitudinal metrics on adoption success or failure.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        
    async def track_adoption(self, user_id: UUID, start_date=None, end_date=None) -> AdoptionMetrics:
        """
        Calculates adoption rates and identifies improved or ignored categories.
        """
        # Fetch records
        query = select(TransactionOptimizationRecord, Transaction.category).join(
            Transaction, TransactionOptimizationRecord.transaction_id == Transaction.id
        ).where(TransactionOptimizationRecord.user_id == user_id)
        
        if start_date:
            query = query.where(Transaction.transaction_date >= start_date)
        if end_date:
            query = query.where(Transaction.transaction_date <= end_date)
            
        results = await self.session.execute(query)
        records = results.all()
        
        total = 0
        adopted = 0
        ignored = 0
        category_stats = {}
        
        for record, category in records:
            total += 1
            if category not in category_stats:
                category_stats[category] = {"adopted": 0, "ignored": 0}
                
            if record.adoption_status == AdoptionStatus.ADOPTED:
                adopted += 1
                category_stats[category]["adopted"] += 1
            elif record.adoption_status == AdoptionStatus.IGNORED:
                ignored += 1
                category_stats[category]["ignored"] += 1
                
        adoption_rate = (adopted / total) * 100 if total > 0 else 0.0
        
        # Determine improving/ignored categories based on thresholds
        improving = []
        ignored_cats = []
        for cat, stats in category_stats.items():
            cat_total = stats["adopted"] + stats["ignored"]
            if cat_total < 3: # Need minimum N transactions for a signal
                continue
                
            cat_rate = (stats["adopted"] / cat_total) * 100
            if cat_rate >= 70:
                improving.append(cat)
            elif cat_rate <= 30:
                ignored_cats.append(cat)
                
        return AdoptionMetrics(
            total_recommendations=total,
            adopted_count=adopted,
            ignored_count=ignored,
            adoption_rate=adoption_rate,
            categories_improved=improving,
            categories_ignored=ignored_cats
        )
