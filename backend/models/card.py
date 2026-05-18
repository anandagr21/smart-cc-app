"""
Module: backend.models.card
Responsibility: Defines the database entity and relationships for a Credit Card.

Architectural Boundaries:
- Strictly for data persistence mapping (SQLModel/SQLAlchemy).
- MUST NOT contain business logic or API validation logic.
- Card configuration (rules, caps, rates) should be stored as JSONB.

TODO:
- Define Card SQLModel schema.
"""
