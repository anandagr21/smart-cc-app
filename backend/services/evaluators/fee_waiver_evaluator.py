from typing import Any, Dict
from services.evaluators.base import BaseFieldEvaluator, EvaluationResult
from models.ingestion import BenchmarkErrorReason

class FeeWaiverEvaluator(BaseFieldEvaluator):
    @property
    def version(self) -> str:
        return "fee_waiver_v1"
        
    def evaluate(self, expected: Dict[str, Any], candidate: Dict[str, Any]) -> EvaluationResult:
        if not candidate:
            return EvaluationResult(0.0, BenchmarkErrorReason.NO_VALUE_FOUND)
            
        score = 0.0
        total_fields = 2 # e.g. value, period
        fields_matched = 0
        
        # 1. Match Value
        exp_val = expected.get("value")
        cand_val = candidate.get("value")
        
        try:
            if exp_val is not None and cand_val is not None and float(exp_val) == float(cand_val):
                fields_matched += 1
            elif exp_val == cand_val:
                fields_matched += 1
        except (ValueError, TypeError):
            pass
            
        # 2. Match Period (Semantic match approach using keywords, simplified for v1)
        exp_period = expected.get("period", "")
        cand_period = candidate.get("period", "")
        
        if exp_period and cand_period:
            if str(exp_period).strip().lower() in str(cand_period).strip().lower() or \
               str(cand_period).strip().lower() in str(exp_period).strip().lower():
                fields_matched += 1
        elif exp_period == cand_period: # Both None
            fields_matched += 1
            
        score = fields_matched / total_fields
        
        if score == 1.0:
            return EvaluationResult(1.0)
        elif score > 0.0:
            return EvaluationResult(score, BenchmarkErrorReason.PARTIAL_MATCH)
        else:
            return EvaluationResult(0.0, BenchmarkErrorReason.EXTRACTION_FAILURE)
