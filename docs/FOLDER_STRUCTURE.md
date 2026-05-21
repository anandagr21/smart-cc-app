# Folder Structure

## 1. Backend Structure (Canonical Vertical Slices)

The backend strictly follows a **domain-driven vertical slice architecture**. Horizontal layers (like global `/services` or `/repositories` for business logic) are deprecated.

```
backend/
├── api/                        # Global HTTP layer routing setup only
│   └── v1/
│       └── __init__.py         # Router aggregation
│
├── core/                       # Cross-cutting concerns
│   ├── config.py               # Environment-based settings
│   ├── database.py             # DB engine, session factory
│   └── constants.py            # Shared global constants
│
├── reward_engine/              # Deterministic financial computation (SHARED CORE)
│   ├── evaluator.py            # Rule evaluation logic
│   ├── ranker.py               # Ranking logic
│   ├── caps.py                 # Cap enforcement
│   └── schemas.py              # Pure data structures
│
├── merchants/                  # Vertical Slice: Merchants
│   ├── models.py               # SQLModel
│   ├── repository.py           # DB access
│   ├── service.py              # Orchestration (e.g. normalization)
│   ├── routes.py               # API endpoints
│   └── schemas.py              # Pydantic contracts
│
├── transactions/               # Vertical Slice: Transactions
│   ├── models.py
│   ├── repository.py
│   ├── service.py
│   ├── routes.py
│   └── schemas.py
│
├── recommendations/            # Vertical Slice: Recommendations
│   ├── orchestrator.py
│   ├── service.py
│   ├── routes.py
│   └── schemas.py
│
├── agents/                     # LangGraph AI orchestrations
│   └── ...
│
├── tests/
│   ├── unit/                   # Scoped to vertical slices
│   └── integration/
│
└── main.py                     # FastAPI app bootstrap
```

---

## 2. Frontend Structure (Canonical Feature-First)

The frontend strictly follows a **feature-first architecture**. `app/` is strictly for routing, and domain UI is owned by `features/`.

```
frontend/
├── app/                        # Expo Router (Routing ONLY)
│   ├── (auth)/
│   │   └── login.tsx           # Imports <LoginScreen /> from features/auth
│   ├── (tabs)/
│   │   ├── index.tsx           # Imports <DashboardScreen /> from features/dashboard
│   │   └── history.tsx         # Imports <HistoryScreen /> from features/transactions
│   └── _layout.tsx
│
├── features/                   # Domain-specific UI and logic
│   ├── auth/
│   │   ├── components/         # Auth-specific UI
│   │   ├── api.ts              # Auth API calls
│   │   └── store.ts            # Auth state
│   │
│   ├── recommendations/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api.ts
│   │
│   └── transactions/
│
├── components/                 # Truly SHARED generic UI primitives
│   ├── Button.tsx              # Custom NativeWind button
│   ├── Typography.tsx
│   └── Card.tsx
│
├── lib/                        # Cross-cutting libraries
│   ├── api.ts                  # Base Axios/fetch client
│   └── utils.ts                # Shared helpers (e.g., tailwind merge)
│
├── constants/                  # Static configs, theme colors
│   └── theme.ts
│
└── assets/                     # Images, fonts
```

---

## 3. Separation of Concerns & Ownership Rules

| Location | Concern | Ownership Rule |
|---|---|---|
| `backend/reward_engine/` | Pure computation | Must never import from domain slices. No DB access. |
| `backend/<domain>/` | Vertical slice | Owns its models, routes, services. |
| `frontend/app/` | Routing | No UI definitions. Just wrappers/providers. |
| `frontend/features/<domain>/` | Domain UI & Logic | Owns its specific components, state, and API hooks. |
| `frontend/components/` | Shared Primitives | Only truly generic, dumb UI components. |

---

## 4. Backend Dependency Direction Rules

```
api/v1 (aggregates) → domain slices (e.g. transactions/) → reward_engine/ (pure)
                                                           ↘ core/
```

- **Allowed:** Domain slices importing from `core/` or `reward_engine/`.
- **Allowed:** Domain slices importing pure services from other domain slices (e.g., `transactions` calling `merchants.service`).
- **Forbidden:** `reward_engine/` importing from ANY domain slice.
- **Forbidden:** Cross-slice DB model inheritance or hidden mutable state dependencies.
