"""
Module: backend.repositories.card_repository
Responsibility: Database access abstraction for Card entities.

Architectural Boundaries:
- Handles all database queries (CRUD).
- MUST NOT contain business logic or rules.
- Returns domain models to the service layer.

TODO:
- Implement get_active_cards_by_user(user_id)
- Implement get_card_by_id(card_id)
"""
