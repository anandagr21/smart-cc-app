# Project Rules & Engineering Standards

## 1. Core Philosophy

- **Simple over clever.** If you need a comment to explain what code does, simplify the code.
- **Explicit over implicit.** Prefer clear names and obvious data flow.
- **Composition over inheritance.** Build behavior by combining small pieces.
- **Pure functions where possible.** Especially in the reward engine.
- **Avoid overengineering.** Build what is needed now, design for extension.

---

## 2. DRY Principles

**Don't Repeat Yourself** — every piece of knowledge must have a single, authoritative representation.

| Rule | Detail |
|---|---|
| One source of truth per business rule | Reward logic lives only in `reward_engine/`. Never duplicated in services or routes. |
| Shared schemas | Common Pydantic models live in `schemas/common.py`. Never redeclare structures. |
| Shared utilities | String helpers, date utils, converters go in `core/utils.py`. |
| No copy-paste logic | If you write the same logic twice, extract it. |
| No magic numbers | All constants (cap values, default rates) go in `core/constants.py` or card config. |

---

## 3. SOLID Principles

### Single Responsibility
- Each module, class, and function has **one reason to change**.
- A service class handles one use case (e.g., `CardRecommendationService`, not `CardService`).
- Routes only validate + delegate. They don't contain logic.

### Open / Closed
- The reward engine is open for extension (new card types, new categories) via configuration, not code changes.
- Add new MCC mappings or multipliers through data, not by modifying engine core.

### Liskov Substitution
- Any concrete repository must fulfill the abstract repository interface contract.
- Engine components must be substitutable without breaking callers.

### Interface Segregation
- Repositories expose only the methods their consumers need.
- Do not create god-interfaces. Prefer small, focused protocols.

### Dependency Inversion
- Services depend on repository **interfaces**, not concrete implementations.
- This enables easy testing via mocks.

---

## 4. Coding Conventions

### Python (Backend)
- Style: **PEP 8** enforced via `ruff`
- Type hints: **required on all functions** (parameters and return types)
- Docstrings: one-line for simple functions; full docstring for public service/engine methods
- Max line length: 100 characters
- Imports: absolute only (no relative imports outside of the same module package)

### TypeScript / React Native (Frontend)
- Style: **ESLint + Prettier**
- Types: all component props and API response types must be typed
- No `any` types allowed
- Components: functional components only (no class components)
- One component per file

### Naming Conventions
| Item | Convention | Example |
|---|---|---|
| Python files | `snake_case` | `reward_engine.py` |
| Python classes | `PascalCase` | `CardRecommendationService` |
| Python functions | `snake_case` | `calculate_effective_reward()` |
| Python constants | `UPPER_SNAKE_CASE` | `DEFAULT_REWARD_RATE` |
| React components | `PascalCase` | `CardRecommendationCard` |
| React hooks | `camelCase` with `use` prefix | `useCardRecommendation()` |
| API endpoints | `kebab-case`, plural nouns | `/api/v1/credit-cards` |
| Database tables | `snake_case`, plural | `credit_cards`, `transactions` |
| Database columns | `snake_case` | `reward_rate`, `created_at` |

---

## 5. Module Boundaries

| Module | Can import from | Cannot import from |
|---|---|---|
| `api/` | `schemas/`, `services/`, `core/` | `repositories/`, `reward_engine/`, `agents/` |
| `services/` | `repositories/`, `reward_engine/`, `schemas/`, `core/` | `api/`, `agents/` |
| `reward_engine/` | `core/constants`, `schemas/` (read-only) | Everything else |
| `repositories/` | `models/`, `core/` | `services/`, `api/`, `reward_engine/`, `agents/` |
| `agents/` | `services/`, `schemas/`, `core/` | `repositories/`, `reward_engine/` directly |
| `models/` | SQLModel only | Any business logic modules |
| `schemas/` | Pydantic only | Any business logic modules |

---

## 6. Async-First Backend Rules

- All FastAPI route handlers must be `async def`
- All repository methods must be `async def`
- All service methods must be `async def`
- Use `asyncpg` or SQLAlchemy async engine for all DB operations
- Never use blocking I/O in async context (no `time.sleep`, no sync file reads in handlers)
- CPU-bound operations (reward computation) are synchronous pure functions — wrap in `asyncio.run_in_executor` if ever called from async context with heavy load

---

## 7. Architectural Constraints

1. **Business logic never in routes.** Routes are HTTP adapters only.
2. **DB access never in services directly.** Always via repository.
3. **AI never computes rewards.** Always call the engine via a service.
4. **No circular imports.** Dependency direction is strictly enforced (see `ARCHITECTURE.md`).
5. **No global mutable state.** Use dependency injection (FastAPI `Depends`).
6. **Config via environment variables.** Never hardcode secrets, URLs, or credentials.
7. **Reward engine is pure.** No DB calls, no network calls, no randomness.

---

## 8. Scalability Guidelines

- Design services to be stateless — horizontal scaling should be trivially possible.
- Use database connection pooling from day one.
- Store card benefit rules as structured JSONB — avoids schema migrations for new cards.
- Avoid tight coupling between card definitions and engine logic.
- AI agents are stateless per request; use LangGraph state only within a single agent run.
- Pagination is mandatory on all list endpoints (see `API_GUIDELINES.md`).
- Index frequently queried columns (user_id, card_id, mcc_code).
