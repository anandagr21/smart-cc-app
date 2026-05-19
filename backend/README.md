# Smart CC Backend

Production-grade FastAPI backend for the Smart CC AI-powered credit card optimization platform.

## Quick Start

```bash
# Install dependencies
cd backend
pip install -e ".[dev]"

# Set up environment (copy and edit as needed)
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start development server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## Folder Structure

```
backend/
├── main.py                       # FastAPI app bootstrap & lifecycle
├── pyproject.toml                # Dependencies & project metadata
├── alembic.ini                   # Alembic migration configuration
├── alembic/
│   ├── env.py                    # Async Alembic environment
│   ├── script.py.mako            # Migration file template
│   └── versions/                 # Auto-generated migration files
├── core/                         # Infrastructure (config, DB, logging, middleware)
│   ├── config.py                 # Pydantic v2 Settings (env-based)
│   ├── database.py               # Async SQLAlchemy engine + session factory
│   ├── logging.py                # Structured JSON logging setup
│   ├── exceptions.py             # Domain exception hierarchy
│   ├── middleware.py              # Request ID, logging, global error handler
│   ├── constants.py              # Shared constants (no magic numbers)
│   └── utils.py                  # Pure utility functions
├── api/                          # HTTP layer (routes only, no business logic)
│   ├── deps.py                   # FastAPI dependency injection providers
│   └── v1/
│       ├── health.py             # Health check endpoint
│       └── auth.py               # Auth routes (future)
├── models/                       # SQLModel DB models
├── schemas/                      # Pydantic API schemas
│   └── common.py                 # PaginatedResponse, ErrorResponse, HealthResponse
├── repositories/                 # Data access layer
│   └── base.py                   # Generic async CRUD repository
├── services/                     # Business logic orchestration
├── reward_engine/               # Pure deterministic financial computation
├── agents/                       # LangGraph AI orchestration
└── tests/                        # Test suite
```

## Architecture

### Layer Boundaries (Hard Rules)

| Layer | Responsibility | Must NOT Do |
|---|---|---|
| `api/` | HTTP interface, input parsing, response formatting | Business logic, DB queries |
| `services/` | Use case orchestration | DB access directly, AI calls |
| `reward_engine/` | Pure financial computation | I/O, DB, AI, randomness |
| `repositories/` | Database access only | Business logic |
| `agents/` | AI orchestration, explanation | Compute rewards, write DB |

### Dependency Direction

```
api/ → services/ → reward_engine/
              ↘ repositories/ → models/
agents/ → services/
```

- No circular imports
- Reward engine is pure — no I/O, no DB, no randomness
- Services depend on repository interfaces (Dependency Inversion)

### Key Patterns

- **Dependency Injection**: FastAPI `Depends()` for all dependencies
- **Async-First**: All route handlers, service methods, and repository methods are `async def`
- **Repository Pattern**: All DB access through repository layer only
- **Stateless Services**: Designed for horizontal scaling
- **Structured Logging**: JSON format in production, includes `request_id` for tracing

## API Endpoints

### Health Check
```
GET /api/v1/health
```

Response:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "database": "connected"
}
```

## Configuration

All configuration via environment variables (or `.env` file). See `core/config.py` for all options.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL connection string |
| `LOG_LEVEL` | `INFO` | Logging level |
| `LOG_FORMAT` | `json` | `json` (prod) or `text` (dev) |
| `ENVIRONMENT` | `development` | `development`, `staging`, or `production` |
| `DEBUG` | `false` | Enable debug mode (swagger docs) |

## Database Migrations

```bash
# Create a new migration (auto-detect changes)
alembic revision --autogenerate -m "add users table"

# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# Generate SQL without running (for review)
alembic upgrade head --sql
```

## Tech Stack

- **Framework**: FastAPI (async)
- **ORM**: SQLModel (SQLAlchemy async)
- **Database**: PostgreSQL with asyncpg driver
- **Migrations**: Alembic (async)
- **Validation**: Pydantic v2
- **Config**: pydantic-settings
- **AI**: LangGraph (future)