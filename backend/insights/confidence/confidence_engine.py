from insights.schemas import ConfidenceLevel

class ConfidenceEngine:
    @staticmethod
    def compute_confidence(
        has_full_history: bool,
        merchant_matched_exactly: bool,
        is_estimation: bool
    ) -> ConfidenceLevel:
        """
        Deterministic confidence scoring.
        NOT probabilistic AI confidence.
        """
        if is_estimation:
            return ConfidenceLevel.ESTIMATED
            
        if has_full_history and merchant_matched_exactly:
            return ConfidenceLevel.HIGH
            
        return ConfidenceLevel.MODERATE
