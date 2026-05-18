# Architecture Patterns

## System Overview

Smart CC is an AI-powered credit card optimization platform with **three concerns**:
1. **Deterministic Reward Engine** — pure financial computation
2. **AI Orchestration Layer** — natural language understanding, routing, explanation
3. **Data Layer** — PostgreSQL + SQLModel ORM

---

## Layer Architecture

```
API Routes (thin) → Services (use cases) → Reward Engine (pure)
                                          → Repositories (DB) → Models
AI Agents (LangGraph) → Services (data retrieval only)
```

---

## Layer Responsibilities

| Layer | Responsibility | Must NOT Do |
|---|---|---|
| `api/` | HTTP interface, input parsing, auth | Business logic, DB queries |
| `services/` | Use case orchestration | DB access directly, AI calls |
| `reward_engine/` | Pure financial computation | I/O, DB, AI, randomness |
| `repositories/` | DB access only | Business logic |
| `agents/` | AI orchestration, intent parsing | Compute rewards, write DB |
| `models/` | SQLModel DB schema | Business logic |
| `schemas/` | Pydantic API contracts | DB logic |
| `core/` | Config, auth, shared utilities | Domain logic |

---

## Dependency Direction

```
api/ → services/ → reward_engine/
              ↘ repositories/ → models/
agents/ → services/
```

**Forbidden imports:**
- Any layer importing from a layer above it
- `reward_engine/` importing from `repositories/` or `services/`
- `repositories/` importing from `services/`
- `api/` importing from `repositories/` directly

---

## Preferred Patterns

- **Dependency injection** via FastAPI `Depends()`
- **Pure functions** in reward engine — no side effects, no I/O, testable
- **Stateless services** for horizontal scaling
- **JSONB** for card benefit rules — avoids schema migrations
- **Pydantic v2** for all validation, `model_config = ConfigDict(extra="forbid")`

---

## Anti-Patterns

- Business logic in API routes
- AI computing financial rewards (LLMs are probabilistic, finance must be exact)
- Circular imports across layers
- Direct DB access from services or agents
- Magic numbers — use `core/constants.py`
- Global mutable state

---

## Best Practices from Codebase

- All modules start with docstrings declaring architectural boundaries and TODOs
- Reward engine modules are pure computation with no I/O
- Services coordinate between repositories and engine, never compute themselves
- AI agents are stateless per request
- Card configs stored as structured JSONB for extensibility