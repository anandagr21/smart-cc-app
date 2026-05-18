# Logging Standards

## Tech Stack

- **Framework:** Python `logging` module
- **Middleware:** `core/middleware.py` — request/response logging
- **Format:** Structured logging (JSON preferred in production)

---

## Rules

### Log Levels
| Level | Usage |
|---|---|
| `DEBUG` | Detailed diagnostic info (dev only) |
| `INFO` | Request lifecycle, service calls, successful operations |
| `WARNING` | Degraded service, retries, near-limit caps |
| `ERROR` | Failed operations, exceptions caught and handled |
| `CRITICAL` | System-wide failures requiring immediate attention |

### What to Log
- **All 5xx errors** — full stack trace (server-side only, never to client)
- **Service method entry/exit** — at DEBUG level
- **External API calls** — duration and status code
- **Auth failures** — at WARNING level (no passwords)
- **Reward engine computation** — inputs and outputs at DEBUG level
- **Database query errors** — at ERROR level

### What NOT to Log
- Passwords, tokens, secrets
- Full credit card numbers (log last 4 digits only)
- PII (phone numbers, emails) in production
- Internal error traces to client responses

---

## Preferred Patterns

### Structured Logging
```python
import logging
logger = logging.getLogger(__name__)

# Basic
logger.info("Card recommendation requested", extra={
    "user_id": str(user_id),
    "merchant": merchant_name,
    "amount": str(amount)
})

# Error with context
logger.error("Failed to compute reward", extra={
    "card_id": str(card_id),
    "transaction_id": str(txn_id)
}, exc_info=True)
```

### Middleware Logging
```python
# core/middleware.py
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        f"{request.method} {request.url.path}",
        extra={
            "status": response.status_code,
            "duration_ms": round(duration * 1000)
        }
    )
    return response
```

### Exception Logging
```python
# core/exceptions.py
class DomainException(Exception):
    def __init__(self, message: str, code: str):
        self.message = message
        self.code = code

# Usage in service
try:
    result = await self.engine.evaluate(cards, context)
except Exception as e:
    logger.error("Reward engine failure", exc_info=True)
    raise DomainException("Failed to compute recommendation", "COMPUTE_ERROR")
```

---

## Anti-Patterns

- Using `print()` instead of `logging`
- Logging sensitive data (passwords, tokens, full card numbers)
- Exposing stack traces to API responses
- Inconsistent log formats across modules
- Missing log context (user_id, request_id)
- Excessive DEBUG logging in production
- Blocking I/O in logging setup for async services

---

## Best Practices from Codebase

- `core/middleware.py` centralizes request/response logging
- `core/exceptions.py` defines domain errors with proper logging
- Custom exceptions carry error codes for client responses
- Structured `extra` dict for machine-parseable log context
- Exception logging always includes `exc_info=True` for stack traces