# Naming Conventions

## Python (Backend)

| Item | Convention | Example |
|---|---|---|
| Files | `snake_case` | `reward_engine.py`, `card_service.py` |
| Classes | `PascalCase` | `CardRecommendationService`, `RewardEngine` |
| Functions | `snake_case` | `calculate_effective_reward()`, `get_user_cards()` |
| Variables | `snake_case` | `user_id`, `transaction_amount` |
| Constants | `UPPER_SNAKE_CASE` | `DEFAULT_REWARD_RATE`, `MAX_PAGE_SIZE` |
| Private members | `_leading_underscore` | `_validate_input()`, `_build_graph()` |
| Modules | `snake_case` | `reward_engine`, `card_service` |
| Packages | `snake_case` | `backend`, `reward_engine` |

## TypeScript / React Native (Frontend)

| Item | Convention | Example |
|---|---|---|
| Components | `PascalCase` | `CardSummary`, `RecommendationCard` |
| Hooks | `camelCase` with `use` prefix | `useCardRecommendation()`, `useTransactions()` |
| Functions | `camelCase` | `fetchCards()`, `formatCurrency()` |
| Variables | `camelCase` | `cardList`, `isLoading` |
| Interfaces/Types | `PascalCase` | `Card`, `TransactionContext` |
| Files (components) | `PascalCase` | `CardSummary.tsx` |
| Files (hooks) | `camelCase` | `useCards.ts` |
| Files (services) | `camelCase` | `cardService.ts` |
| Files (stores) | `camelCase` | `cardStore.ts` |
| Constants | `UPPER_SNAKE_CASE` | `API_BASE_URL`, `MAX_RETRIES` |

## API Endpoints

| Item | Convention | Example |
|---|---|---|
| Resources | `kebab-case`, plural | `/credit-cards`, `/transactions` |
| Nested resources | `kebab-case` | `/credit-cards/{id}/transactions` |
| Actions | `kebab-case` | `/recommendations/compare` |

## Database

| Item | Convention | Example |
|---|---|---|
| Tables | `snake_case`, plural | `credit_cards`, `transactions` |
| Columns | `snake_case` | `reward_rate`, `created_at` |
| Primary keys | `id` (UUID) | `id` |
| Foreign keys | `{entity}_id` | `user_id`, `card_id` |
| Timestamps | `created_at`, `updated_at` | `created_at` |
| Indexes | `ix_{table}_{column}` | `ix_credit_cards_user_id` |

## Error Codes

| Item | Convention | Example |
|---|---|---|
| Error codes | `SCREAMING_SNAKE_CASE` | `CARD_NOT_FOUND`, `INVALID_MCC` |

## Git

| Item | Convention | Example |
|---|---|---|
| Branches | `kebab-case` | `feature/add-reward-caps`, `fix/auth-token-expiry` |
| Commits | Imperative mood | `Add reward cap enforcement` |

---

## Rules

- **Be explicit** — names should describe purpose, not implementation
- **No abbreviations** unless universally understood (e.g., `id`, `url`, `api`)
- **No Hungarian notation** — types are in type hints, not names
- **No single-letter variables** except in comprehensions or trivial loops
- **Boolean variables** prefixed with `is_`, `has_`, `should_` — `is_active`, `has_next`
- **Collection variables** use plural — `cards`, `transactions`