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
from merchants.routes import router as merchants_router
from rewards.routes import router as reward_rules_router
from reward_engine.eval_routes import router as eval_router
from recommendations.routes import router as recommendations_router
from transactions.routes import router as transactions_router
from .insights import router as insights_router
from .monthly_intelligence import router as monthly_intelligence_router
from .personality import router as personality_router
from core.config import get_settings

settings = get_settings()

api_router = APIRouter(prefix=settings.api_v1_prefix)

# Register route modules here
api_router.include_router(auth_router)
api_router.include_router(cards_router)
api_router.include_router(health_router)
api_router.include_router(merchants_router)
api_router.include_router(reward_rules_router)
api_router.include_router(eval_router)
api_router.include_router(recommendations_router)
api_router.include_router(transactions_router)
api_router.include_router(insights_router)
api_router.include_router(monthly_intelligence_router)
api_router.include_router(personality_router)
