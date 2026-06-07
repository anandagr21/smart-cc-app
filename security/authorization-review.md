# Authorization Security Review

## Summary
The authorization review evaluated whether the application properly enforces resource ownership (e.g., User A cannot access User B's data) and restricts administrative endpoints. The review identified **critical Insecure Direct Object Reference (IDOR) vulnerabilities** and a complete lack of authorization on administrative and intelligence routes.

## Confirmed IDOR Issues

### 1. Card Transactions (Critical)
- **Vulnerable Endpoint**: `GET /api/v1/transactions/card/{card_id}`
- **Attack Scenario**: The route fetches transactions using `TransactionService.fetch_card_transactions(card_id)`. The repository queries transactions belonging to `card_id`, but the route *never verifies* if `card_id` actually belongs to the authenticated `current_user`. An attacker can iterate over UUIDs to dump transaction histories of any user.
- **Affected Data**: Financial transactions (amounts, merchants, dates).
- **Fix Recommendation**: In `list_card_transactions`, explicitly verify ownership:
  ```python
  card = await user_card_service.get_card_by_id(current_user.id, card_id)
  ```
  before fetching the transactions, or pass `user_id` down to the transaction repository query.

## Authorization Gaps & Vertical Privilege Escalation

### 1. Unprotected Card Catalog Admin Endpoints (Critical)
- **Vulnerable Endpoints**: 
  - `POST /api/v1/cards/catalog`
  - `PATCH /api/v1/cards/catalog/{card_id}`
  - `DELETE /api/v1/cards/catalog/{card_id}`
- **Attack Scenario**: These routes have no `Depends(get_current_user)` or Role-Based Access Control (RBAC). Any unauthenticated user over the internet can mutate or delete the global production card catalog.
- **Affected Data**: The core `CardCatalog` table.
- **Fix Recommendation**: Create a `get_current_admin` dependency and apply it to these endpoints.

### 2. Unprotected Card Intelligence Endpoints (Critical)
- **Vulnerable Endpoints**: 
  - `POST /api/v1/card-intelligence/ingest-raw`
  - `POST /api/v1/card-intelligence/review/action`
  - `GET /api/v1/card-intelligence/review/{card_id}`
- **Attack Scenario**: Similar to the catalog, these routes lack `Depends(get_current_user)`. Unauthenticated attackers can trigger expensive LLM extraction jobs (causing Denial of Wallet/Service) or directly commit arbitrary JSON to the `CardCatalog` via `/review/action`.
- **Affected Data**: `CardMonitoring`, `CardCatalog`, external LLM API quotas.
- **Fix Recommendation**: Secure all `/card-intelligence/*` endpoints with a strict `get_current_admin` dependency.
