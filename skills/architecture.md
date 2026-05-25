# Architecture Patterns (FINALIZED GOVERNANCE)

> [!IMPORTANT]  
> **ARCHITECTURE FREEZE ALIGNMENT**  
> The architectural styles defined here are **FINAL** and frozen. Do NOT redesign the architecture or introduce new structural styles without explicit critical requirements. The goal is strict governance and preventing future architecture drift.

## System Overview

Smart CC is an AI-powered credit card optimization platform with **three core concerns**:
1. **Deterministic Reward Engine** — pure financial computation (Shared Core).
2. **Domain Vertical Slices** — feature-focused backend modules (e.g., Transactions, Merchants).
3. **AI Orchestration Layer** — natural language understanding, routing, explanation.

---

## 1. Backend Architecture (Vertical Slice Canonical)

The backend has standardized on a **Vertical Slice Architecture**. 
- Old horizontal layers (global `services/`, `repositories/`) are deprecated.
- **Business modules live as domain slices** (e.g., `backend/transactions/`, `backend/recommendations/`).
- **Deterministic reward engine remains isolated/shared** (`backend/reward_engine/`).

### Layer Responsibilities inside a Vertical Slice

| Layer | Responsibility | Must NOT Do |
|---|---|---|
| `routes.py` | HTTP interface, input parsing | Business logic, DB queries |
| `service.py` | Use case orchestration | DB access directly, AI calls |
| `repository.py` | Persistence only | Business logic |
| `models.py` | SQLModel DB schema | Business logic |
| `schemas.py` | Pydantic API contracts | DB logic |

---

## 2. Frontend Architecture (Feature-First Canonical)

The frontend has standardized on a **Feature-First Architecture**.
- **`app/` is routing only**: Expo Router file-based routing. Keep files thin.
- **`features/` owns domain-specific UI**: Each domain (e.g., `auth`, `dashboard`) owns its specific UI components, hooks, and API integrations.
- **`components/` contains only truly shared UI**: Only generic primitives (e.g., `<Button>`, `<Card>`) live here. Do not place feature-specific UI in this global folder.
- Avoid future folder reshuffling.

---

## 3. Dependency Philosophy

- **Minimize Dependency Count**: Prefer built-in solutions or building custom logic over importing external libraries.
- **Battle-Tested & Open Source**: Prefer heavily maintained, MIT/open-source libraries.
- **Avoid Heavy Frameworks**: Do not introduce massive, highly-opinionated frameworks (e.g., UI Kitten, NativeBase) that abstract away control.

---

## 4. Backend Dependency Direction

```
api/v1 (aggregates) → domain slices (e.g. transactions/) → reward_engine/ (pure)
                                                           ↘ core/
```

**Forbidden imports:**
- `reward_engine/` importing from ANY domain slice or repository.
- Cross-slice DB model inheritance or hidden mutable state dependencies.

---

## 5. Deterministic Engine Philosophy

The reward engine must remain **PURE**.
- No DB access inside the engine.
- No AI calculations inside the engine (LLMs are probabilistic; finance must be exact).
- No FastAPI dependencies.
- No hidden mutable state.
- Deterministic outputs are mandatory. Same inputs must always equal the same outputs.

---

## 6. Shared vs Feature Ownership Rules

- **Shared (`frontend/components/`, `backend/reward_engine/`, `backend/core/`)**: Generic logic or pure computation used by multiple domains. Treat this as a strictly governed internal library.
- **Feature (`frontend/features/`, `backend/<domain_slice>/`)**: Specific business use-cases. They own their internal UI, services, and schemas, and cannot leak internal components to other features.