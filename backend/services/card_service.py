"""
Module: backend.services.card_service
Responsibility: Orchestrates use cases related to credit cards.

Architectural Boundaries:
- Coordinates workflows by calling Repositories (for data) and Reward Engine (for computation if needed).
- MUST NOT contain HTTP logic (request/response).
- MUST NOT contain direct database queries (use Repositories).
- MUST NOT contain deterministic reward calculation logic (use Reward Engine).

TODO:
- Implement get_user_cards(user_id)
- Implement add_user_card(user_id, card_data)
"""
