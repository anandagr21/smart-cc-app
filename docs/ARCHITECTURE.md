# Architecture Overview

## 1. System Summary

Smart CC is an AI-powered credit card optimization platform. It recommends the best credit card for a given merchant/transaction by running a **deterministic reward engine** and presenting results via an AI layer for explanation and orchestration.

The system is split into three concerns:
1. **Deterministic Reward Engine** – pure, testable, financial computation
2. **AI Orchestration Layer** – natural language understanding, routing, explanation
3. **Data Layer** – persistent storage via PostgreSQL + SQLModel ORM

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native (Expo)                     │
│              UI / UX / State / API Client                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (REST)
┌──────────────────────────▼──────────────────────────────────┐
│                     FastAPI Backend                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  API Routes │  │   Services   │  │  Reward Engine     │ │
│  │  (thin)     │→ │  (use cases) │→ │  (pure/determin.)  │ │
│  └─────────────┘  └──────┬───────┘  └────────────────────┘ │
│                          │                                   │
│  ┌───────────────────────▼──────────────────────────────┐   │
│  │              Repository Layer (DB access)            │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          │                                   │
│  ┌───────────────────────▼──────────────────────────────┐   │
│  │           AI Orchestration (LangGraph)               │   │
│  │   Statement Parsing · Card Recommendation · Chat     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  PostgreSQL (JSONB)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Backend / Frontend Separation

| Concern | Owner |
|---|---|
| All business logic, reward calculation, rule evaluation | Backend (FastAPI) |
| All data persistence and querying | Backend (Repository layer) |
| UI state, rendering, navigation | Frontend (React Native Expo) |
| Network calls | Frontend API client → Backend REST endpoints |

**Rule:** The frontend is a thin client. It never computes reward values, applies rules, or reads the database directly.

---

## 4. Deterministic Reward Engine

The Reward Engine is the **single source of truth** for all financial computations.

- Inputs: a card definition + transaction context (merchant, MCC, amount, category)
- Outputs: effective rupee reward value, breakdown, applicable caps, exclusions
- Properties: **pure functions**, no side effects, no I/O, fully unit-testable
- Location: `backend/reward_engine/`

It is invoked by the **Service layer** only. It is never called from:
- API routes
- AI agents
- Repository layer

See `REWARD_ENGINE.md` for full specification.

---

## 5. AI Orchestration Layer

Built with **LangGraph**. Responsible for:
- Parsing natural language input (chat, uploaded statements)
- Routing user intent to the correct service
- Generating human-readable explanations of reward engine results
- Multi-step agent flows (e.g., "Which card should I use at Swiggy?")

**The AI layer NEVER performs financial calculations.** It calls services, receives structured data from the reward engine, and produces explanations only.

See `AI_BOUNDARIES.md` for full rules.

---

## 6. Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **API Routes** | HTTP interface only. Input parsing, response formatting, auth checks. No business logic. |
| **Services** | Orchestrate use cases. Call repositories + reward engine. Return structured results. |
| **Reward Engine** | Pure financial computation. Cashback, points, caps, exclusions, ranking. |
| **Repositories** | All DB access. Return domain models. No business logic. |
| **AI Agents (LangGraph)** | Intent parsing, explanation generation, agent orchestration. Never compute rewards. |
| **Schemas** | Pydantic models for API I/O. SQLModel models for DB. Keep them separate. |

---

## 7. Why AI Must Not Replace the Deterministic Engine

1. **Accuracy** – LLMs are probabilistic. Financial calculations must be exact.
2. **Auditability** – Every reward recommendation must be traceable to a rule.
3. **Testability** – Pure functions can be unit-tested; LLM outputs cannot.
4. **Consistency** – The same inputs must always produce the same reward output.
5. **Regulatory safety** – Financial apps require reproducible, defensible logic.

The AI layer exists to improve UX, not to perform computation.

---

## 8. Folder Responsibilities (Backend)

See `FOLDER_STRUCTURE.md` for the full breakdown.

| Folder | Role |
|---|---|
| `api/` | Route definitions only |
| `services/` | Use case orchestration |
| `reward_engine/` | Deterministic financial computation |
| `repositories/` | Database access |
| `models/` | SQLModel DB models |
| `schemas/` | Pydantic API schemas |
| `agents/` | LangGraph agent definitions |
| `core/` | Config, auth, middleware, shared utilities |

---

## 9. Dependency Direction

```
API Routes → Services → Reward Engine
                      ↘ Repositories → Models (DB)
AI Agents  → Services (for data retrieval only)
```

No layer imports from a layer above it. The reward engine imports nothing from services or repositories.
