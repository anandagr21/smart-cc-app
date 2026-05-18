# AI Development Workflow

## 1. Purpose

This document defines how AI coding agents (and human developers working with AI assistance) should generate code for this project. The goal is consistent, reviewable, DRY, and architecturally sound output on every generation.

---

## 2. Spec-Driven Development

**Before generating any code, a spec must exist.**

A spec is a short, structured description of what is being built. It includes:
- **What** module/layer is being generated
- **Inputs** (function parameters, API request body, DB fields)
- **Outputs** (return types, API response shape)
- **Business rules** that apply
- **Which docs apply** (reference `REWARD_ENGINE.md`, `AI_BOUNDARIES.md`, etc.)

AI agents must ask for or be provided a spec before writing implementation code. Never generate open-ended code without a bounded spec.

---

## 3. Small-Context Generation Strategy

Generate **one module at a time**. Never generate the full application in a single prompt.

Preferred generation order per feature:
1. **Schema** (Pydantic model for API I/O)
2. **DB Model** (SQLModel model if new entity)
3. **Repository method** (data access only)
4. **Reward Engine function** (if financial computation needed)
5. **Service method** (orchestration — calls repository + engine)
6. **API route** (thin HTTP layer — calls service)
7. **Agent tool** (if AI orchestration is needed)
8. **Tests** (unit tests for engine; integration tests for service + repo)

Each step is reviewed before moving to the next. Do not skip steps or combine layers.

---

## 4. Module-First Implementation Strategy

Always implement the **deepest layer first**, then build upward.

```
DB Model → Repository → Engine function → Service → Route → Agent
```

This prevents generating routes that call non-existent services, and services that call non-existent repositories.

---

## 5. Context Loading Rules

When generating code for a module, the AI agent must load the following context documents:

| Generating | Load these docs |
|---|---|
| Any module | `ARCHITECTURE.md`, `PROJECT_RULES.md`, `FOLDER_STRUCTURE.md` |
| Reward engine function | `REWARD_ENGINE.md`, `DOMAIN_TERMS.md` |
| AI agent or tool | `AI_BOUNDARIES.md`, `ARCHITECTURE.md` |
| API route | `API_GUIDELINES.md`, `PROJECT_RULES.md` |
| Any financial calculation | `REWARD_ENGINE.md`, `AI_BOUNDARIES.md` |
| Domain model or schema | `DOMAIN_TERMS.md` |

Never generate financial logic without loading `REWARD_ENGINE.md` and `AI_BOUNDARIES.md`.

---

## 6. Code Generation Rules

AI agents must follow these rules on every generation:

| Rule | Detail |
|---|---|
| **No logic in routes** | Routes call services and return responses only |
| **No DB access in services** | Services call repositories only |
| **No reward computation in AI agents** | Agents call services; engine computes |
| **Type hints required** | All Python functions must have typed params and return types |
| **No magic numbers** | Use constants from `core/constants.py` |
| **No `any` in TypeScript** | All frontend types must be explicit |
| **Async-first** | All service and repository methods must be `async def` |
| **Pure engine functions** | Reward engine functions must be synchronous, pure, and side-effect-free |
| **Pydantic validation** | All API inputs validated via Pydantic schemas |
| **Error codes** | Use named error codes from `core/exceptions.py`, not raw strings |

---

## 7. Review Checklist

Before accepting any AI-generated code, verify:

### Architecture
- [ ] Code is in the correct layer/folder
- [ ] No business logic in routes
- [ ] No DB access outside repositories
- [ ] No reward computation outside the engine

### Code Quality
- [ ] All functions have type hints
- [ ] No duplicated logic (DRY)
- [ ] No magic numbers or hardcoded strings
- [ ] Async used correctly (no blocking calls in async context)

### Domain
- [ ] Terminology matches `DOMAIN_TERMS.md`
- [ ] Financial values are `Decimal`, not `float`
- [ ] Amounts in INR only
- [ ] Exclusions and caps handled (not silently ignored)

### API (if applicable)
- [ ] Response structure follows `API_GUIDELINES.md`
- [ ] Error codes are named constants
- [ ] Pagination present on list endpoints
- [ ] No internal details exposed in error responses

### Tests
- [ ] Unit tests exist for all engine functions
- [ ] Edge cases covered: zero amount, excluded merchant, cap exceeded, missing redemption rate

---

## 8. When to Stop and Ask

AI agents must pause and ask the developer when:
- The spec is ambiguous about business rules
- A reward rate, cap value, or exclusion rule is not in the card config
- The request requires modifying the reward engine's core logic
- A new domain term is needed that is not in `DOMAIN_TERMS.md`
- There is a conflict between two doc rules

**Do not invent business rules.** Do not assume financial values. Always ask.
