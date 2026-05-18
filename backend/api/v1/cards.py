"""
Module: backend.api.v1.cards
Responsibility: HTTP interface for card-related operations.

Architectural Boundaries:
- MUST NOT contain business logic.
- MUST NOT access the database directly.
- Only responsible for request/response orchestration, validation via Pydantic, and calling the Service layer.

TODO:
- Implement GET /cards (list user cards)
- Implement POST /cards (add a new card)
- Implement GET /cards/{card_id} (get card details)
"""

# class CardsRouter:
#     pass
