"""
Module: backend.agents.recommendation_agent
Responsibility: LangGraph orchestration for natural language card recommendation queries.

Architectural Boundaries:
- Parses user intent and routes to appropriate services.
- Generates human-readable explanations based on engine output.
- MUST NEVER perform financial calculations (calls Reward Engine via Service instead).
- Stateless per request.

TODO:
- Define LangGraph workflow nodes/edges for recommendation queries.
- Implement prompt templates for parsing and explanation.
"""
