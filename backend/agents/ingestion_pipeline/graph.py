import logging
from langgraph.graph import StateGraph, END
from typing import TypedDict, Any

from .state import IngestionState
from .agent1_discovery import run_discovery_agent
from .agent2_mapper import run_mapper_agent
from .agent3_validation import run_validation_agent
from .agent4_fix import run_fix_agent

logger = logging.getLogger(__name__)

def check_validation(state: IngestionState) -> str:
    cards_to_fix = state.get("cards_to_fix", [])
    fix_retries = state.get("fix_retries", {})
    
    # If no cards need fixing, we are done
    if not cards_to_fix:
        return "end"
        
    # Check if all cards to fix have reached max retries
    all_maxed_out = True
    for card_id in cards_to_fix:
        if fix_retries.get(card_id, 0) < 3:
            all_maxed_out = False
            break
            
    if all_maxed_out:
        logger.warning("All failing cards have reached max retries. Ending pipeline.")
        return "end"
        
    return "fix"

def create_ingestion_graph():
    workflow = StateGraph(IngestionState)
    
    # Add nodes
    workflow.add_node("discovery", run_discovery_agent)
    workflow.add_node("mapper", run_mapper_agent)
    workflow.add_node("validation", run_validation_agent)
    workflow.add_node("fix", run_fix_agent)
    
    # Set entry point
    workflow.set_entry_point("discovery")
    
    # Define edges
    workflow.add_edge("discovery", "mapper")
    workflow.add_edge("mapper", "validation")
    
    # Conditional edge after validation
    workflow.add_conditional_edges(
        "validation",
        check_validation,
        {
            "end": END,
            "fix": "fix"
        }
    )
    
    # After fix, always go back to validation
    workflow.add_edge("fix", "validation")
    
    return workflow.compile()
