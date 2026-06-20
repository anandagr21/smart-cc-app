from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from api.deps import get_db
from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from portfolio_evolution.service import PortfolioEvolutionService

router = APIRouter(prefix="/portfolio-evolution", tags=["portfolio_evolution"])


@router.get("/")
async def get_portfolio_evolution(
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
