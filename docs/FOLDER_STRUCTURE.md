# Folder Structure

## 1. Backend Structure

```
backend/
├── api/                        # HTTP layer — routes only
│   └── v1/
│       ├── cards.py            # /credit-cards endpoints
│       ├── recommendations.py  # /recommendations endpoints
│       ├── transactions.py     # /transactions endpoints
│       └── auth.py             # /auth endpoints
│
├── services/                   # Use case orchestration
│   ├── card_service.py
│   ├── recommendation_service.py
│   ├── transaction_service.py
│   └── statement_service.py
│
├── reward_engine/              # Deterministic financial computation
│   ├── calculator.py           # Main engine entry point
│   ├── cashback.py             # Cashback logic
│   ├── points.py               # Points logic
│   ├── multipliers.py          # Multiplier application
│   ├── exclusions.py           # Exclusion evaluation
│   ├── caps.py                 # Cap enforcement
│   ├── merchant_matcher.py     # Merchant/MCC matching
│   ├── ranker.py               # Card ranking logic
│   └── normalizer.py           # Rupee value normalization
│
├── repositories/               # Database access layer
│   ├── card_repository.py
│   ├── transaction_repository.py
│   └── user_repository.py
│
├── models/                     # SQLModel database models (ORM)
│   ├── card.py
│   ├── transaction.py
│   └── user.py
│
├── schemas/                    # Pydantic API schemas
│   ├── card.py
│   ├── transaction.py
│   ├── recommendation.py
│   └── common.py               # Shared response wrappers, pagination
│
├── agents/                     # LangGraph agent definitions
│   ├── recommendation_agent.py
│   ├── statement_parser_agent.py
│   ├── chat_agent.py
│   └── tools/                  # Agent tool definitions
│       ├── recommendation_tool.py
│       └── statement_tool.py
│
├── core/                       # Cross-cutting concerns
│   ├── config.py               # Environment-based settings (pydantic-settings)
│   ├── auth.py                 # JWT / auth helpers
│   ├── database.py             # DB engine, session factory
│   ├── constants.py            # Shared constants (rates, defaults)
│   ├── exceptions.py           # Custom exception classes
│   ├── middleware.py           # Request logging, error handling
│   └── utils.py                # Pure utility functions
│
├── tests/
│   ├── unit/                   # Unit tests (engine, services)
│   ├── integration/            # DB integration tests
│   └── fixtures/               # Shared test data
│
├── main.py                     # FastAPI app bootstrap
├── pyproject.toml
└── .env.example
```

---

## 2. Frontend Structure

```
frontend/
├── app/                        # Expo Router file-based routing
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── index.tsx           # Home / recommendation screen
│   │   ├── cards.tsx           # My cards
│   │   └── history.tsx         # Transaction history
│   └── _layout.tsx
│
├── components/                 # Reusable UI components
│   ├── cards/
│   │   ├── CardSummary.tsx
│   │   └── RecommendationCard.tsx
│   ├── transactions/
│   │   └── TransactionRow.tsx
│   └── common/
│       ├── Button.tsx
│       ├── LoadingSpinner.tsx
│       └── ErrorBanner.tsx
│
├── hooks/                      # Custom React hooks
│   ├── useCardRecommendation.ts
│   ├── useCards.ts
│   └── useTransactions.ts
│
├── services/                   # API client layer
│   ├── api.ts                  # Axios/fetch base client
│   ├── cardService.ts
│   ├── recommendationService.ts
│   └── transactionService.ts
│
├── store/                      # Global state (Zustand or Redux)
│   ├── authStore.ts
│   └── cardStore.ts
│
├── types/                      # TypeScript type definitions
│   ├── card.ts
│   ├── transaction.ts
│   └── api.ts                  # API response wrapper types
│
├── constants/                  # Static frontend config
│   └── config.ts
│
├── utils/                      # Pure frontend utility functions
│   └── formatting.ts           # Currency, date formatting
│
└── assets/                     # Images, fonts
```

---

## 3. Separation of Concerns

| Folder | Concern | What it must NOT do |
|---|---|---|
| `api/` | HTTP interface | Contain business logic or DB queries |
| `services/` | Use case coordination | Access DB directly or call AI agents |
| `reward_engine/` | Financial computation | Do I/O, call services, access DB |
| `repositories/` | Data persistence | Contain business rules |
| `agents/` | AI orchestration | Compute rewards, write to DB |
| `models/` | DB schema | Contain business logic |
| `schemas/` | API contract | Contain DB logic |
| `core/` | Shared infrastructure | Contain domain logic |

---

## 4. Dependency Direction Rules

```
api/ → services/ → reward_engine/
              ↘ repositories/ → models/
agents/ → services/
```

- **Allowed:** Deeper layers importing from `core/` or `schemas/`
- **Forbidden:** Any layer importing from a layer above it
- **Forbidden:** `reward_engine/` importing from `repositories/` or `services/`
- **Forbidden:** `repositories/` importing from `services/`
- **Forbidden:** `api/` importing from `repositories/` directly

---

## 5. Module Communication Rules

| Module A | Can call | Cannot call |
|---|---|---|
| API route | Service | Repository, Reward Engine, Agent internals |
| Service | Repository, Reward Engine | API layer, Agent graph |
| Reward Engine | Nothing (pure) | Everything else |
| Repository | DB session (core) | Service, Reward Engine, Agents |
| Agent | Service (via tools) | Repository, Reward Engine directly |
| Frontend service | Backend REST API | Internal backend modules |
