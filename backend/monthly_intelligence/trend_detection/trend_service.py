from typing import Dict, List, Optional
from pydantic import BaseModel

from monthly_intelligence.schemas import ConfidenceLevel


class TrendSignal(BaseModel):
    metric: str
    delta: float
    is_improvement: bool
    confidence: ConfidenceLevel


class TrendDetectionService:
    """
    Detects longitudinal behavioral trends while aggressively filtering out noise.
    Suppresses insignificant fluctuations (< 2%).
    """

    # Minimum delta to be considered a meaningful trend (percentage points or percentage change)
    SIGNIFICANCE_THRESHOLD = 2.0

    def detect_trends(self, current_metrics: dict, previous_metrics: dict) -> List[TrendSignal]:
        signals = []

        if not previous_metrics or previous_metrics.get("transaction_count", 0) == 0:
            return signals  # Cannot detect trends without baseline

        # 1. Optimization Rate Trend
        curr_opt_rate = current_metrics.get("optimization_rate", 0)
        prev_opt_rate = previous_metrics.get("optimization_rate", 0)
        opt_delta = curr_opt_rate - prev_opt_rate

        if abs(opt_delta) >= self.SIGNIFICANCE_THRESHOLD:
            signals.append(
                TrendSignal(
                    metric="optimization_rate",
                    delta=opt_delta,
                    is_improvement=opt_delta > 0,
                    confidence=self._score_confidence(opt_delta)
                )
            )

        # 2. Missed Opportunity Trend (Lower is better)
        curr_missed = current_metrics.get("missed_opportunity_value", 0)
        prev_missed = previous_metrics.get("missed_opportunity_value", 0)
        
        if prev_missed > 0:
            missed_change_pct = ((curr_missed - prev_missed) / prev_missed) * 100
            if abs(missed_change_pct) >= self.SIGNIFICANCE_THRESHOLD:
                signals.append(
                    TrendSignal(
                        metric="missed_opportunity_value",
                        delta=curr_missed - prev_missed,
                        is_improvement=missed_change_pct < 0,  # Decrease in missed is an improvement
                        confidence=self._score_confidence(abs(missed_change_pct))
                    )
                )

        return signals

    def _score_confidence(self, abs_change: float) -> ConfidenceLevel:
        """
        Assigns confidence level based on the magnitude of the behavioral change.
        """
        if abs_change >= 10.0:
            return ConfidenceLevel.STRONG_TREND
        elif abs_change >= 5.0:
            return ConfidenceLevel.MODERATE_TREND
        else:
            return ConfidenceLevel.EARLY_SIGNAL
