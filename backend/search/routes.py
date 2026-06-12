from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from api.deps import get_db

from .schemas import (
    SearchResolveRequest,
    SearchResolveResponse,
    GroupedSearchSuggestions,
    SearchEventCreate
)
from .service import resolve_search_query

router = APIRouter(prefix="/search", tags=["search"])

from .suggestions import get_search_suggestions

@router.get("/suggestions", response_model=GroupedSearchSuggestions)
async def get_suggestions(q: str, db: AsyncSession = Depends(get_db)):
    return await get_search_suggestions(q, db)

@router.post("/resolve", response_model=SearchResolveResponse)
async def resolve_search(request: SearchResolveRequest, db: AsyncSession = Depends(get_db)):
    session_id = request.session_id
    if not session_id:
        import uuid
        session_id = uuid.uuid4()
    
    intent = await resolve_search_query(request.query, session_id, db)
    
    return SearchResolveResponse(
        session_id=session_id,
        intent=intent
    )

from search.models import SearchEvent

@router.post("/events")
async def create_search_event(request: SearchEventCreate, db: AsyncSession = Depends(get_db)):
    event = SearchEvent(
        session_id=request.session_id,
        event_type=request.event_type,
        payload=request.payload
    )
    db.add(event)
    await db.commit()
    return {"status": "ok"}

from merchants.schemas import AliasConfirmRequest, AliasConfirmResponse
from merchants.service import MerchantService
from api.deps import get_merchant_service

@router.post("/alias/learn", response_model=AliasConfirmResponse)
async def learn_search_alias(
    request: AliasConfirmRequest,
    service: MerchantService = Depends(get_merchant_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Learn a user-confirmed search alias.
    Proxy to the MerchantService's alias confirmation logic.
    """
    return await service.confirm_alias(
        raw_name=request.raw_name,
        merchant_id=request.merchant_id,
        session=db
    )
