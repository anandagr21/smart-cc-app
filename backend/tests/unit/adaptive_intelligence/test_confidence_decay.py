import pytest
from datetime import datetime, timedelta
from adaptive_intelligence.scoring.confidence_engine import BehavioralConfidenceEngine
from transactions.models import Transaction

def test_confidence_decays_without_recent_transactions():
    engine = BehavioralConfidenceEngine()
    
    now = datetime.utcnow().date()
    
    # Transactions exist, but they are all older than 30 days
    old_txs = [
        Transaction(id="t1", category="DINING", transaction_date=now - timedelta(days=40)),
        Transaction(id="t2", category="DINING", transaction_date=now - timedelta(days=45)),
        Transaction(id="t3", category="DINING", transaction_date=now - timedelta(days=50)),
    ]
    
    # Despite 3 transactions, they are not recent, so confidence should decay to EARLY_SIGNAL
    confidence = engine.calculate_confidence("DINING", old_txs, True)
    assert confidence == "EARLY_SIGNAL"

def test_sustained_evidence_yields_strong_trend():
    engine = BehavioralConfidenceEngine()
    
    now = datetime.utcnow().date()
    
    sustained_txs = [
        # Recent
        Transaction(id="t1", category="TRAVEL", transaction_date=now - timedelta(days=10)),
        Transaction(id="t2", category="TRAVEL", transaction_date=now - timedelta(days=15)),
        Transaction(id="t3", category="TRAVEL", transaction_date=now - timedelta(days=20)),
        # Historic (30-90)
        Transaction(id="t4", category="TRAVEL", transaction_date=now - timedelta(days=40)),
        Transaction(id="t5", category="TRAVEL", transaction_date=now - timedelta(days=50)),
        Transaction(id="t6", category="TRAVEL", transaction_date=now - timedelta(days=60)),
    ]
    
    confidence = engine.calculate_confidence("TRAVEL", sustained_txs, False)
    assert confidence == "STRONG_TREND"
