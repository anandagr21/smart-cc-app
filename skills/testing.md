# Testing Strategy

## Tech Stack

- **Backend:** `pytest` + `pytest-asyncio`
- **Mocks:** `pytest-mock` or `unittest.mock`
- **Coverage:** `pytest-cov`
- **Frontend:** Jest + React Native Testing Library (future)

---

## Test Structure

```
backend/tests/
├── unit/                    # Pure function tests
│   ├── reward_engine/       # Engine component tests
│   ├── services/            # Service tests (mocked repos)
│   └── schemas/             # Pydantic validation tests
├── integration/             # DB + API integration
│   ├── api/                 # Route integration tests
│   └── repositories/        # Repository + real DB tests
└── fixtures/                # Shared test data, factories
```

---

## Rules

### Unit Tests
- **Reward engine tests are highest priority** — pure functions, easy to test
- Every engine module must have unit tests for:
  - Normal cases
  - Edge cases (zero amount, maximum cap, exclusion)
  - Invalid inputs (negative amounts, missing fields)
- Service tests use mocked repositories
- No real DB, no network, no file I/O in unit tests

### Integration Tests
- Test API routes end-to-end with test database
- Test repository methods with real DB (SQLite in-memory for speed)
- Test auth flow: register → login → access protected route

### Coverage Targets
- Reward engine: 100% (every code path)
- Services: 90%+
- Repositories: 80%+

---

## Preferred Patterns

### Engine Unit Test
```python
# tests/unit/reward_engine/test_cashback.py
import pytest
from decimal import Decimal
from reward_engine.cashback import compute_cashback

def test_cashback_standard_rate():
    result = compute_cashback(rate=Decimal("5.0"), amount=Decimal("1000"))
    assert result == Decimal("50.00")

def test_cashback_zero_amount():
    result = compute_cashback(rate=Decimal("5.0"), amount=Decimal("0"))
    assert result == Decimal("0.00")

def test_cashback_high_precision():
    result = compute_cashback(rate=Decimal("3.33"), amount=Decimal("999.99"))
    assert result == Decimal("33.30")  # rounded to 2 decimal places
```

### Service Test with Mocks
```python
# tests/unit/services/test_recommendation_service.py
@pytest.mark.asyncio
async def test_get_best_card(mock_card_repo, mock_engine):
    mock_card_repo.get_user_cards.return_value = [card_a, card_b]
    mock_engine.evaluate.return_value = ranked_list
    
    service = RecommendationService(mock_card_repo, mock_engine)
    result = await service.get_best_card(user_id, context)
    
    assert result.top_card.name == "Card A"
    mock_engine.evaluate.assert_called_once()
```

### Integration Test
```python
# tests/integration/api/test_recommendations.py
@pytest.mark.asyncio
async def test_recommendation_endpoint(async_client, test_db):
    response = await async_client.post(
        "/api/v1/recommendations",
        json={"merchant": "Swiggy", "amount": "1500"}
    )
    assert response.status_code == 200
    assert "data" in response.json()
```

---

## Anti-Patterns

- Skipping tests for reward engine modules
- Testing services with real DB connections (use mocks)
- Hardcoded test values without explanation
- Unstable tests (relying on execution order, time, or randomness)
- Testing implementation details instead of behavior
- No edge case coverage
- Ignoring Decimal precision in assertions

---

## Best Practices from Codebase

- `tests/fixtures/` contains shared test data and factory functions
- Unit tests focus on pure reward engine computation
- Integration tests use dedicated test database
- Tests are organized mirroring source code structure
- All async tests use `pytest-asyncio` markers