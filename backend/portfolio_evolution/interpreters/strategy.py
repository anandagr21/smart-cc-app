from typing import List
from .base import NarrativeObservation

class StrategyInterpreter:
    @staticmethod
    def interpret(alignment: float, density: float) -> List[NarrativeObservation]:
        observations = []
        
        if alignment > 8.0:
            observations.append(NarrativeObservation(
                category="strategy",
                tone="affirming",
                importance=0.85,
                narrative="Your portfolio remains structurally aligned with your long-term optimization goals.",
                supporting_metrics={"strategic_alignment": alignment}
            ))
        elif alignment < 5.0:
            observations.append(NarrativeObservation(
                category="strategy",
                tone="neutral",
                importance=0.7,
                narrative="Recent behavior suggests a shift away from your historical optimization baseline.",
                supporting_metrics={"strategic_alignment": alignment}
            ))

        if density < 0.5:
            observations.append(NarrativeObservation(
                category="strategy",
                tone="cautionary",
                importance=0.75,
                narrative="Several premium structures appear underutilized relative to their annual fee burden.",
                supporting_metrics={"value_density": density}
            ))
        elif density > 3.0:
            observations.append(NarrativeObservation(
                category="strategy",
                tone="affirming",
                importance=0.8,
                narrative="Your portfolio is operating efficiently with strong value density.",
                supporting_metrics={"value_density": density}
            ))
            
        return observations
