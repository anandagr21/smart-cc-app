# Database Rules

## Tech Stack

- **Database:** PostgreSQL
- **ORM:** SQLModel (async SQLAlchemy)
- **Extra:** JSONB for flexible card configs

---

## Rules

### Naming
- **Tables:** `snake_case`, plural — `credit_cards`, `transactions`, `users`
- **Columns:** `snake_case` — `reward_rate`, `created_at`, `user_id`
- **PK:** `id` (UUID, auto-generated)
- **FK:** `{entity}_id` — `user_id`, `card_id`
- **Timestamps:** `created_at`, `updated_at` (UTC)

### Data Types
| Concern | Type |
|---|---|
| Monetary values | `DECIMAL(12, 2)` — never `FLOAT` |
| IDs | `UUID` |
| Card benefit rules | `JSONB` |
| Booleans | `BOOLEAN` |
| Timestamps | `TIMESTAMPTZ` |
| Enums | Python Enum → VARCHAR with check constraint |

### Schema Management
- Use **Alembic** for migrations
- Card benefit rules stored as **JSONB** — avoids schema migrations for new cards
- All tables must have `created_at` and `updated_at` timestamps
- Foreign keys must be indexed

### Async-First
- All DB operations use **async engine** (`create_async_engine`)
- Sessions managed by `async_sessionmaker`
- Inject sessions via FastAPI `Depends()`

---

## Preferred Patterns

### Model Definition
```python
from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from datetime import datetime

class Card(SQLModel, table=True):
    __tablename__ = "credit_cards"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    name: str = Field(max_length=100)
    card_config: dict = Field(sa_column=Column(JSONB))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### Repository Access
```python
class CardRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_user_cards(self, user_id: UUID) -> list[Card]:
        stmt = select(Card).where(Card.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def create(self, card: Card) -> Card:
        self.session.add(card)
        await self.session.commit()
        await self.session.refresh(card)
        return card
```

### Session Injection
```python
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with session_factory() as session:
        yield session
```

---

## Anti-Patterns

- `FLOAT` for monetary values — use `DECIMAL`
- Direct DB access from services or API routes — use repositories
- Missing indexes on foreign keys
- Hardcoded SQL strings — use SQLAlchemy ORM
- Sync DB calls in async context
- Business logic in model classes
- Storing card rules as fixed columns (use JSONB)

---

## Best Practices from Codebase

- `models/` contains only SQLModel table definitions — no business logic
- `repositories/` encapsulates all DB access, returns domain models
- Card configs use JSONB for extensibility without migrations
- `core/database.py` provides centralized async engine and session factory
- All entities use UUID primary keys