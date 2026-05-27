from typing import List, Dict, Any
from .base import NarrativeObservation
from .topology import TopologyInterpreter
from .strategy import StrategyInterpreter
from .evolution import EvolutionInterpreter

class NarrativeOrchestrator:
    """
    Synthesizes interpretations from various domain-specific interpreters
    and orchestrates them into a unified cognitive snapshot.
    """
    
    @staticmethod
    def synthesize(complexity: float, redundancy: float, density: float, burden: float, alignment: float) -> Dict[str, Any]:
        
        # 1. Gather all observations
        topology_obs = TopologyInterpreter.interpret(redundancy, complexity)
        strategy_obs = StrategyInterpreter.interpret(alignment, density)
        evolution_obs = EvolutionInterpreter.interpret(burden)
        
        # In the future, this is where suppression, fatigue management, and novelty tracking would occur.
        # For now, we simply sort them by importance (highest first) and limit to top 1-2 per category
        # to preserve pacing and avoid overloading the UI.
        
        def filter_and_serialize(observations: List[NarrativeObservation], limit: int = 2) -> List[dict]:
            # Sort by importance descending
            sorted_obs = sorted(observations, key=lambda x: x.importance, reverse=True)
            # Take top N and serialize to dict for JSON storage
            return [obs.dict() for obs in sorted_obs[:limit]]

        final_topology = filter_and_serialize(topology_obs, limit=2)
        final_strategy = filter_and_serialize(strategy_obs, limit=2)
        final_evolution = filter_and_serialize(evolution_obs, limit=2)
        
        # Determine the primary narrative (the single most important observation across all categories)
        all_obs = topology_obs + strategy_obs + evolution_obs
        primary_narrative_str = "Your portfolio structure remains stable and aligned with baseline optimization."
        if all_obs:
            top_obs = max(all_obs, key=lambda x: x.importance)
            primary_narrative_str = top_obs.narrative

        return {
            "primary_narrative": primary_narrative_str,
            "topology_insights": final_topology,
            "strategy_reflections": final_strategy,
            "evolution_observations": final_evolution
        }
