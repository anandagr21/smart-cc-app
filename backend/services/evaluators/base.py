from abc import ABC, abstractmethod
from typing import Any, Dict, Tuple, Optional
from models.ingestion import BenchmarkErrorReason

class EvaluationResult:
    def __init__(self, score: float, error_reason: Optional[BenchmarkErrorReason] = None):
        self.score = score
        self.error_reason = error_reason

class BaseFieldEvaluator(ABC):
    """Base class for field-specific ground truth evaluators."""
    
    @property
    @abstractmethod
    def version(self) -> str:
        """The version of the evaluator, e.g., 'v1'"""
        pass
        
    @abstractmethod
    def evaluate(self, expected: Dict[str, Any], candidate: Dict[str, Any]) -> EvaluationResult:
        """
        Evaluate the candidate value against the expected ground truth.
        Returns an EvaluationResult with score (0.0-1.0) and optional error reason.
        """
        pass
