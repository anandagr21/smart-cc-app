from typing import Any, Dict
from services.evaluators.base import BaseFieldEvaluator, EvaluationResult
from models.ingestion import BenchmarkErrorReason

class FeeEvaluator(BaseFieldEvaluator):
    """Evaluates standard fee fields (annual_fee, joining_fee, renewal_fee)."""
    
    @property
    def version(self) -> str:
        return "fee_evaluator_v1"
        
    def evaluate(self, expected: Dict[str, Any], candidate: Dict[str, Any]) -> EvaluationResult:
        if not candidate:
            return EvaluationResult(0.0, BenchmarkErrorReason.NO_VALUE_FOUND)
            
        expected_value = expected.get("value")
        candidate_value = candidate.get("value")
        
        if expected_value is None and candidate_value is None:
            return EvaluationResult(1.0)
            
        if expected_value is None or candidate_value is None:
            return EvaluationResult(0.0, BenchmarkErrorReason.EXTRACTION_FAILURE)
            
        try:
            expected_float = float(expected_value)
            candidate_float = float(candidate_value)
            
            if expected_float == candidate_float:
                return EvaluationResult(1.0)
            else:
                return EvaluationResult(0.0, BenchmarkErrorReason.EXTRACTION_FAILURE)
        except (ValueError, TypeError):
            # Fallback to string comparison if not castable to float
            if str(expected_value).strip().lower() == str(candidate_value).strip().lower():
                return EvaluationResult(1.0)
            return EvaluationResult(0.0, BenchmarkErrorReason.EXTRACTION_FAILURE)
