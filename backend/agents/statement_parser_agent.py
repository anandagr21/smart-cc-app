"""
Module: backend.agents.statement_parser_agent
Responsibility: Orchestrates extraction of transactions from uploaded statements.

Architectural Boundaries:
- Uses LLM for structured extraction from text.
- MUST NOT write to the database (returns structured data to service layer).
- MUST NOT perform financial computations.

TODO:
- Define extraction prompt and structured output schema.
"""
