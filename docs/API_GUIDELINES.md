# API Guidelines

## 1. REST Conventions

- Use **plural nouns** for resource names: `/credit-cards`, `/transactions`, `/recommendations`
- Use **kebab-case** for multi-word paths: `/credit-cards`, `/reward-caps`
- Use standard HTTP methods semantically:
  - `GET` – retrieve resource(s), no side effects
  - `POST` – create a resource or trigger an action
  - `PUT` – full replacement of a resource
  - `PATCH` – partial update
  - `DELETE` – remove a resource
- All routes are prefixed with `/api/v1/`
- Never expose internal IDs directly — use UUIDs

---

## 2. Response Structures

### Success Response (single resource)
```json
{
  "data": { ... },
  "meta": {}
}
```

### Success Response (list)
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

- `data` is always present on success (never `null`)
- `error` is never present on success
- `meta` is always present on list responses

---

## 3. Error Handling

| HTTP Status | Use Case |
|---|---|
| `200 OK` | Successful GET, PUT, PATCH |
| `201 Created` | Successful POST that creates a resource |
| `204 No Content` | Successful DELETE |
| `400 Bad Request` | Invalid input / validation failure |
| `401 Unauthorized` | Missing or invalid auth token |
| `403 Forbidden` | Authenticated but not authorized |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Duplicate resource or state conflict |
| `422 Unprocessable Entity` | Pydantic validation error (FastAPI default) |
| `500 Internal Server Error` | Unexpected server error |

Error codes (`error.code`) are **SCREAMING_SNAKE_CASE** strings. Example: `CARD_NOT_FOUND`, `INVALID_MCC`, `REWARD_CAP_EXCEEDED`.

All 500 errors must be logged server-side with full stack trace. Never expose internal details to the client.

---

## 4. Pagination Conventions

- All list endpoints support pagination via query params: `?page=1&page_size=20`
- Default `page_size`: 20. Maximum `page_size`: 100.
- Response `meta` always includes: `total`, `page`, `page_size`, `has_next`
- Cursor-based pagination may be used for high-volume endpoints (e.g., transactions) — document clearly when used
- Never return unbounded lists

---

## 5. Validation Principles

- All input is validated via **Pydantic schemas** at the route level
- Validation happens before the request reaches the service layer
- Reject unknown fields (use `model_config = ConfigDict(extra="forbid")`)
- Numeric fields must have min/max constraints where applicable
- Dates must use ISO 8601 format: `YYYY-MM-DD`
- Amounts are always `Decimal`, not `float`, to avoid floating-point errors
- Enum fields must be validated against known enum values

---

## 6. API Versioning Strategy

- All routes are versioned via URL path prefix: `/api/v1/`
- A new major version (`/api/v2/`) is introduced only for **breaking changes**
- Non-breaking additions (new fields, new endpoints) do not require a version bump
- Old versions are supported for a minimum of 6 months after a new version is released
- Version deprecation is communicated via response headers: `Deprecation: true`, `Sunset: <date>`
- Internal services always call the latest version; versioning is primarily for external clients

---

## 7. Additional Rules

- Never return passwords, tokens, or internal error traces in responses
- All timestamps are UTC in ISO 8601 format: `2024-01-15T10:30:00Z`
- Currency values are always in INR, represented as `Decimal` with 2 decimal places
- Boolean fields use `true`/`false` (never `1`/`0` or `"yes"`/`"no"`)
- Empty collections return `[]`, never `null`
