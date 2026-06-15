from typing import Any, Dict
from services.evaluators.base import BaseFieldEvaluator, EvaluationResult
from models.ingestion import BenchmarkErrorReason

class WelcomeBonusEvaluator(BaseFieldEvaluator):
    @property
    def version(self) -> str:
        return "welcome_bonus_v1"
        
    def evaluate(self, expected: Dict[str, Any], candidate: Dict[str, Any]) -> EvaluationResult:
        if not candidate:
            return EvaluationResult(0.0, BenchmarkErrorReason.NO_VALUE_FOUND)
            
        score = 0.0
        total_fields = 2 # e.g. points, spend_requirement
        fields_matched = 0
        
        # Simple evaluation: 50% for correct points, 50% for correct spend requirement
        exp_points = expected.get("points")
        cand_points = candidate.get("points")
        
        try:
            if exp_points is not None and cand_points is not None and float(exp_points) == float(cand_points):
                fields_matched += 1
            elif exp_points == cand_points:
                fields_matched += 1
        except (ValueError, TypeError):
            pass
            
        exp_spend = expected.get("spend_requirement")
        cand_spend = candidate.get("spend_requirement")
        
        try:
            if exp_spend is not None and cand_spend is not None and float(exp_spend) == float(cand_spend):
                fields_matched += 1
            elif exp_spend == cand_spend:
                fields_matched += 1
        except (ValueError, TypeError):
            pass
            
        score = fields_matched / total_fields
        
        if score == 1.0:
            return EvaluationResult(1.0)
        elif score > 0.0:
            return EvaluationResult(score, BenchmarkErrorReason.PARTIAL_MATCH)
        else:
            return EvaluationResult(0.0, BenchmarkErrorReason.EXTRACTION_FAILURE)
