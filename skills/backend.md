# Backend Conventions

## Tech Stack

- **Framework:** FastAPI (async)
- **ORM:** SQLModel (SQLAlchemy async)
- **AI:** LangGraph for agent orchestration
- **Validation:** Pydantic v2
- **Config:** pydantic-settings
- **DB:** PostgreSQL with JSONB support

---

## Rules

### Async-First
- All route handlers: `async def`
- All repository methods: `async def`
- All service methods: `async def`
- Use `asyncpg` or SQLAlchemy async engine
- Never use blocking I/O in async context (no `time.sleep`, no sync file reads in handlers)
- CPU-bound reward computation is synchronous pure functions — wrap in `asyncio.run_in_executor` if needed

### Type Hints
- **Required on all functions** (parameters and return types)
- Use `Decimal` for all monetary values — never `float`
- Use `UUID` for all entity IDs

### Docstrings
- One-line for simple functions
- Full docstring for public service/engine methods
- Every module starts with docstring declaring architectural boundaries and TODOs

### Imports
- Absolute imports only (no relative imports outside same module package)
- Standard library → third-party → local imports order

---

## Preferred Patterns

### Dependency Injection
```python
# Route
@router.post("/recommendations")
async def get_recommendation(
    request: RecommendationRequest,
    service: RecommendationService = Depends(get_recommendation_service)
):
    return await service.get_best_card(request)
```

### Service Layer Pattern
```python
class RecommendationService:
    def __init__(self, card_repo: CardRepository, engine: RewardEngine):
        self.card_repo = card_repo
        self.engine = engine
    
    async def get_best_card(self, user_id: UUID, context: TransactionContext):
        cards = await self.card_repo.get_user_cards(user_id)
        results = self.engine.evaluate(cards, context)
        return results
```

### Repository Pattern
```python
class CardRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_user_cards(self, user_id: UUID) -> list[Card]:
        result = await self.session.execute(
            select(Card).where(Card.user_id == user_id)
        )
        return result.scalars().all()
```

---

## Anti-Patterns

- Sync functions in async routes
- `float` for monetary values — use `Decimal`
- Business logic in API routes
- Direct DB access from services (use repositories)
- Missing type hints on public functions
- Relative imports outside same package
- Hardcoded secrets or URLs — use `core/config.py`

---

## Best Practices from Codebase

- All modules in `backend/` start with docstrings declaring architectural boundaries
- `core/config.py` uses pydantic-settings for env-based configuration
- `core/exceptions.py` defines domain-specific errors mapped to HTTP codes
- `core/database.py` provides async session factory for FastAPI dependency injection
- `core/middleware.py` handles request logging and error handling
- `core/utils.py` contains pure utility functions shared across modules