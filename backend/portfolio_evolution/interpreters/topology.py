from typing import List
from .base import NarrativeObservation

class TopologyInterpreter:
    @staticmethod
    def interpret(redundancy: float, complexity: float) -> List[NarrativeObservation]:
        observations = []
        
        if redundancy > 6.0:
            observations.append(NarrativeObservation(
                category="topology",
                tone="observational",
                importance=0.8,
                narrative="Several cards in your wallet currently overlap in strategic category coverage.",
                supporting_metrics={"redundancy": redundancy}
            ))
        elif redundancy < 3.0:
            observations.append(NarrativeObservation(
                category="topology",
                tone="observational",
                importance=0.6,
                narrative="Your portfolio shows distinct, non-overlapping coverage across core categories.",
                supporting_metrics={"redundancy": redundancy}
            ))

        if complexity > 8.0:
            observations.append(NarrativeObservation(
                category="topology",
                tone="cautionary",
                importance=0.9,
                narrative="Your wallet topology is highly complex, requiring fragmented optimization decisions.",
                supporting_metrics={"complexity": complexity}
            ))
            
        return observations
