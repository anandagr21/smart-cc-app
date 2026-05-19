# API Patterns

## Rules

### REST Conventions
- **Plural nouns** for resources: `/credit-cards`, `/transactions`, `/recommendations`
- **kebab-case** for multi-word paths: `/credit-cards`, `/reward-caps`
- Standard HTTP methods used semantically
- All routes prefixed with `/api/v1/`
- Never expose internal IDs — use UUIDs

### HTTP Method Mapping
| Method | Purpose |
|---|---|
| `GET` | Retrieve resource(s), no side effects |
| `POST` | Create resource or trigger action |
| `PUT` | Full replacement of resource |
| `PATCH` | Partial update |
| `DELETE` | Remove resource |

---

## Response Structures

### Single Resource
```json
{
  "data": { ... },
  "meta": {}
}
```

### List Response
```json
{
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "page_size": 20,
    "has_next": true
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "CARD_NOT_FOUND",
    "message": "Credit card with ID 'xyz' was not found.",
    "details": {}
  }
}
```

- `data` always present on success, never `null`
- `error` never present on success
- `meta` always present on list responses
- Empty collections return `[]`, never `null`

---

## Error Handling

| HTTP Status | Use Case | Error Code Format |
|---|---|---|
| `200` | Successful GET, PUT, PATCH | — |
| `201` | Successful POST (created) | — |
| `204` | Successful DELETE | — |
| `400` | Invalid input / validation | `INVALID_INPUT` |
| `401` | Missing/invalid auth token | `UNAUTHORIZED` |
| `403` | Authenticated but forbidden | `FORBIDDEN` |
| `404` | Resource not found | `CARD_NOT_FOUND` |
| `409` | Duplicate / state conflict | `DUPLICATE_CARD` |
| `422` | Pydantic validation error | `VALIDATION_ERROR` |
| `500` | Unexpected server error | `INTERNAL_ERROR` |

- Error codes: **SCREAMING_SNAKE_CASE** — `CARD_NOT_FOUND`, `INVALID_MCC`
- 500 errors: log full stack trace server-side, never expose to client

---

## Pagination

- Query params: `?page=1&page_size=20`
- Default `page_size`: 20. Max: 100
- Response `meta` always: `total`, `page`, `page_size`, `has_next`
- Never return unbounded lists

---

## Route Implementation Pattern

```python
# backend/api/v1/recommendations.py
from fastapi import APIRouter, Depends
from schemas.recommendation import RecommendationRequest, RecommendationResponse
from services.recommendation_service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.post("", response_model=RecommendationResponse)
async def get_recommendation(
    request: RecommendationRequest,
    service: RecommendationService = Depends(get_recommendation_service)
) -> RecommendationResponse:
    """Get best card recommendation for a transaction context."""
    result = await service.get_best_card_for_transaction(request)
    return RecommendationResponse(data=result)
```

---

## Validation Principles

- All input validated via **Pydantic schemas** at route level
- Validation happens before request reaches service layer
- Reject unknown fields: `model_config = ConfigDict(extra="forbid")`
- Numeric fields must have min/max constraints
- Dates: ISO 8601 format `YYYY-MM-DD`
- Amounts: always `Decimal`, not `float`
- Enum fields validated against known values

---

## Versioning

- URL path prefix: `/api/v1/`
- New major version only for **breaking changes**
- Non-breaking additions don't require version bump
- Old versions supported minimum 6 months after new release
- Deprecation via headers: `Deprecation: true`, `Sunset: <date>`

---

## Additional Rules

- Never return passwords, tokens, or internal error traces
- All timestamps: UTC ISO 8601 `2024-01-15T10:30:00Z`
- Currency: INR, Decimal with 2 decimal places
- Boolean fields: `true`/`false`, never `1`/`0` or `"yes"`/`"no"`

---

## Anti-Patterns

- Business logic in route handlers
- Exposing internal database IDs
- Returning `null` for empty collections
- Missing pagination on list endpoints
- Skipping Pydantic validation
- Using floats for monetary values
- Mixing error formats across endpoints