from fastapi import APIRouter, Depends, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from api.deps import get_db
from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from core.config import get_settings
from core.rate_limit import limiter

settings = get_settings()
from portfolio_evolution.service import PortfolioEvolutionService

router = APIRouter(prefix="/portfolio-evolution", tags=["portfolio_evolution"])


@router.get("/")
@limiter.limit(settings.rate_limit_portfolio_evolution)
async def get_portfolio_evolution(
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    snapshot = await PortfolioEvolutionService.generate_snapshot(current_user.id, db)
    
    return {
        "snapshot_date": snapshot.snapshot_date,
        "complexity_score": snapshot.complexity_score,
        "value_density": snapshot.value_density,
        "redundancy_score": snapshot.redundancy_score,
        "fee_efficiency_score": snapshot.fee_efficiency_score,
        "strategic_alignment_score": snapshot.strategic_alignment_score,
        "primary_narrative": snapshot.primary_narrative,
        "created_at": snapshot.created_at
    }
