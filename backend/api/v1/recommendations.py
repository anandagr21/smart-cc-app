"""
Module: backend.api.v1.recommendations
Responsibility: HTTP interface for retrieving card recommendations.

Architectural Boundaries:
- MUST NOT contain business logic or deterministic reward calculations.
- Orchestrates the request, validates input, and delegates to the recommendation_service.

TODO:
- Implement POST /recommendations (get best card for a transaction context)
"""
