from typing import List
from .base import NarrativeObservation

class EvolutionInterpreter:
    @staticmethod
    def interpret(burden: float) -> List[NarrativeObservation]:
        observations = []
        
        if burden > 7.0:
            observations.append(NarrativeObservation(
                category="evolution",
                tone="observational",
                importance=0.9,
                narrative="Recent behavior suggests an increasing preference for portfolio simplicity over category maximization.",
                supporting_metrics={"burden": burden}
            ))
        elif burden < 4.0:
            observations.append(NarrativeObservation(
                category="evolution",
                tone="observational",
                importance=0.7,
                narrative="You are consistently executing high-effort optimization strategies across multiple networks.",
                supporting_metrics={"burden": burden}
            ))
            
        return observations
