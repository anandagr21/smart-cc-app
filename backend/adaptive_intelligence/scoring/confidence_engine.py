from typing import List
from datetime import datetime, timedelta

from transactions.models import Transaction

class BehavioralConfidenceEngine:
    """
    Determines how strongly the system believes a behavioral trend actually exists.
    Requires sustained evidence and explicitly decays if behavior is missing.
    """
    
    def calculate_confidence(self, category: str, recent_transactions: List[Transaction], is_improving: bool) -> str:
        """
        Returns 'STRONG_TREND', 'MODERATE_TREND', or 'EARLY_SIGNAL'.
        """
        # Filter for the specific category
        cat_txs = [tx for tx in recent_transactions if tx.category == category]
        
        if not cat_txs:
            return "EARLY_SIGNAL" # Decay handling: no recent evidence, drops to early signal
            
        now = datetime.utcnow().date()
        
        # Check recency of behavior
        recent_txs_last_30_days = [
            tx for tx in cat_txs 
            if tx.transaction_date and (now - tx.transaction_date).days <= 30
        ]
        
        txs_30_to_90_days = [
            tx for tx in cat_txs 
            if tx.transaction_date and 30 < (now - tx.transaction_date).days <= 90
        ]
        
        if len(recent_txs_last_30_days) == 0:
            # Decay: Behavior existed in the past but not recently
            return "EARLY_SIGNAL"
            
        if len(recent_txs_last_30_days) >= 3 and len(txs_30_to_90_days) >= 3:
            # Sustained evidence across multiple billing cycles
            return "STRONG_TREND"
            
        if len(recent_txs_last_30_days) >= 2:
            return "MODERATE_TREND"
            
        return "EARLY_SIGNAL"
