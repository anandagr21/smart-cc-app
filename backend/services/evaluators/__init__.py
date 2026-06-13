from typing import Dict, Type, Any
from services.evaluators.base import BaseFieldEvaluator
from services.evaluators.fee_evaluator import FeeEvaluator
from services.evaluators.welcome_bonus_evaluator import WelcomeBonusEvaluator
from services.evaluators.fee_waiver_evaluator import FeeWaiverEvaluator

def get_evaluator(field_name: str) -> BaseFieldEvaluator:
    """Returns the appropriate evaluator for a given field name."""
    if field_name in ["annual_fee", "joining_fee", "renewal_fee"]:
        return FeeEvaluator()
    elif field_name == "welcome_bonus":
        return WelcomeBonusEvaluator()
    elif field_name == "fee_waiver_spend":
        return FeeWaiverEvaluator()
    else:
        # Fallback to strict evaluation if no specific evaluator exists
        return StrictJsonEvaluator()

class StrictJsonEvaluator(BaseFieldEvaluator):
    @property
    def version(self) -> str:
        return "strict_json_v1"
        
    def evaluate(self, expected: Dict, candidate: Dict) -> Any:
        from services.evaluators.base import EvaluationResult
        from models.ingestion import BenchmarkErrorReason
        if candidate is None:
            return EvaluationResult(0.0, BenchmarkErrorReason.NO_VALUE_FOUND)
            
        import json
        try:
            expected_str = json.dumps(expected, sort_keys=True)
            candidate_str = json.dumps(candidate, sort_keys=True)
            if expected_str == candidate_str:
                return EvaluationResult(1.0)
            return EvaluationResult(0.0, BenchmarkErrorReason.EXTRACTION_FAILURE)
        except Exception:
            return EvaluationResult(0.0, BenchmarkErrorReason.EXTRACTION_FAILURE)
