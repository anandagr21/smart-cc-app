from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession

from auth.dependencies import get_current_user
from auth.schemas import UserResponse
from cards.enums import OptimizationPersonality
from core.database import get_db
from services.personality_service import PersonalityService

router = APIRouter(prefix="/personality", tags=["personality"])


class PersonalityUpdateRequest(BaseModel):
    personality: OptimizationPersonality


@router.get("/")
async def get_personality(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await PersonalityService.get_personality(db, current_user.id)


@router.put("/")
async def update_personality(
    request: PersonalityUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await PersonalityService.update_personality(
        db, current_user.id, request.personality
    )
