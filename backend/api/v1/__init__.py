"""
Module: backend.api.v1
Responsibility: API v1 router aggregation.

Architectural Boundaries:
- Aggregates all v1 route modules into a single FastAPI router.
- Mounted at /api/v1 in main.py.
- No business logic — just router composition.

Decision: A central `api_router` allows main.py to mount all v1 endpoints
with a single `app.include_router()` call. New route modules are added here
as they are created.
"""

from fastapi import APIRouter

from .auth import router as auth_router
from .cards import router as cards_router
from .health import router as health_router
from core.config import get_settings

settings = get_settings()

api_router = APIRouter(prefix=settings.api_v1_prefix)

# Register route modules here
api_router.include_router(auth_router)
api_router.include_router(cards_router)
api_router.include_router(health_router)
