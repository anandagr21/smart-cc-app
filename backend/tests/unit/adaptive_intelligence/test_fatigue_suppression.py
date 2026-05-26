import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timedelta

from adaptive_intelligence.suppression.fatigue_engine import RecommendationFatigueEngine
from adaptive_intelligence.schemas import AdaptiveInsight
from models.insight_suppression import InsightSuppression

@pytest.mark.asyncio
async def test_fatigue_suppresses_nagging_insights():
    session = AsyncMock()
    user_id = uuid4()
    engine = RecommendationFatigueEngine(session)
    
    now = datetime.utcnow()
    
    # Mock the database result
    mock_history = [
        InsightSuppression(
            user_id=user_id,
            insight_category="TRAVEL",
            insight_hash="hash_123",
            last_shown_at=now - timedelta(days=i*10)
        ) for i in range(3)
    ]
    
    # Setup mock query execution
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = mock_history
    session.execute.return_value = mock_result
    
    insight = AdaptiveInsight(
        insight_id="hash_123",
        category="TRAVEL",
        text="Use card X for Travel",
        reasoning_evidence=[],
        longitudinal_context="",
        confidence_level="STRONG_TREND"
    )
    
    filtered = await engine.filter_fatigued_insights(user_id, [insight], material_change=False)
    
    assert len(filtered) == 1
    assert filtered[0].is_suppressed is True
    assert filtered[0].priority_score == 0

@pytest.mark.asyncio
async def test_material_change_bypasses_fatigue():
    session = AsyncMock()
    user_id = uuid4()
    engine = RecommendationFatigueEngine(session)
    
    now = datetime.utcnow()
    
    mock_history = [
        InsightSuppression(
            user_id=user_id,
            insight_category="DINING",
            insight_hash="hash_456",
            last_shown_at=now - timedelta(days=i*10)
        ) for i in range(3)
    ]
    
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = mock_history
    session.execute.return_value = mock_result
    
    insight = AdaptiveInsight(
        insight_id="hash_456",
        category="DINING",
        text="Use new card Y for Dining",
        reasoning_evidence=[],
        longitudinal_context="",
        confidence_level="STRONG_TREND"
    )
    
    # material_change=True means the user added a new card or the reward delta spiked
    filtered = await engine.filter_fatigued_insights(user_id, [insight], material_change=True)
    
    assert len(filtered) == 1
    assert filtered[0].is_suppressed is False
