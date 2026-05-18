# Deployment Patterns

## Tech Stack

- **Backend:** FastAPI (Docker container)
- **Frontend:** Expo (mobile builds via EAS)
- **DB:** PostgreSQL (managed or containerized)
- **CI/CD:** GitHub Actions
- **Infrastructure:** AWS or similar cloud provider

---

## Rules

### Environment Configuration
- **All config via environment variables** — never hardcode secrets, URLs, credentials
- Use `pydantic-settings` for backend configuration
- `.env.example` documents required variables, never contains real secrets
- `.env` files are `.gitignore`'d
- Production secrets via cloud secrets manager (AWS Secrets Manager, etc.)

### Environment Variables (Backend)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (async) |
| `SECRET_KEY` | JWT signing key |
| `LLM_API_KEY` | LLM provider API key |
| `LLM_MODEL` | Model name (e.g., `gpt-4o`) |
| `LOG_LEVEL` | Logging level (`INFO`, `DEBUG`, etc.) |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) |
| `ENVIRONMENT` | `development`, `staging`, `production` |

### Containerization
- Backend runs in Docker container
- Multi-stage builds for smaller images
- Health check endpoint at `/health`
- Graceful shutdown handling for async tasks

---

## Preferred Patterns

### Dockerfile Structure
```dockerfile
# Multi-stage build
FROM python:3.12-slim AS builder
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

FROM python:3.12-slim AS runtime
COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY backend/ /app/backend/
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Backend Config
```python
# core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    llm_api_key: str
    environment: str = "development"
    log_level: str = "INFO"
    
    model_config = ConfigDict(env_file=".env")

settings = Settings()
```

### Health Check
```python
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
```

---

## Scaling Considerations

- Services are **stateless** — horizontal scaling via multiple containers
- Database connection pooling from day one
- Reward engine is pure compute — can be scaled independently if needed
- AI agents are stateless per request — no sticky sessions required
- Use async workers (uvicorn with `async` loop)

---

## CI/CD Pipeline

```
Push → GitHub Actions →
  1. Lint (ruff, ESLint)
  2. Type check (mypy, tsc)
  3. Test (pytest, Jest)
  4. Build Docker image
  5. Push to container registry
  6. Deploy to staging → production
```

---

## Anti-Patterns

- Hardcoded secrets or URLs in code
- Committing `.env` files
- Single-container architecture without scaling strategy
- No health check endpoints
- Deployment without CI/CD pipeline
- Mixing environment configs (dev credentials in production)
- Skipping graceful shutdown for in-flight requests

---

## Best Practices from Codebase

- `core/config.py` uses `pydantic-settings` for typed env config
- `.env.example` documents all required variables without secrets
- Backend is designed for containerization (FastAPI + async)
- Frontend uses Expo EAS for mobile builds
- All services are stateless for horizontal scaling