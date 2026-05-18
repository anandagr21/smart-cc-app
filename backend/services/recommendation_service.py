"""
Module: backend.services.recommendation_service
Responsibility: Coordinates the card recommendation workflow.

Architectural Boundaries:
- Gathers user cards from repositories.
- Passes cards and transaction context to the pure Reward Engine.
- Receives ranked list and passes it to the AI orchestration layer for explanation (if requested).
- MUST NOT compute rewards itself.

TODO:
- Implement get_best_card_for_transaction(user_id, transaction_context)
"""
