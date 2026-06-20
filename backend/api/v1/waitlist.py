import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from core.database import get_db
from models.waitlist import WaitlistEntry
from schemas.waitlist import WaitlistCreate, WaitlistResponse

router = APIRouter()

# --- Rate limiting for waitlist endpoint ---
# NOTE: This in-memory rate limiter only works within a single Lambda warm
# invocation. Across cold starts, each invocation has its own counter.
# For production, configure API Gateway rate limiting or swap for a
# shared store (Redis/ElastiCache, DynamoDB TTL counters).
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_MAX = 5
_RATE_LIMIT_WINDOW = 60  # seconds


async def _rate_limit_waitlist(request: Request) -> None:
    """Raise HTTP 429 if the client IP has exceed the rate limit window."""
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    # Purge expired timestamps
    _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if now - t < _RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[ip]) >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again in a minute.",
        )
    _rate_limit_store[ip].append(now)


@router.post("/", response_model=WaitlistResponse)
async def join_waitlist(
    payload: WaitlistCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _rate_limited: None = Depends(_rate_limit_waitlist),
):
    # Check if email exists
    statement = select(WaitlistEntry).where(WaitlistEntry.email == payload.email)
    result = await db.execute(statement)
    existing_entry = result.scalar_one_or_none()

    if existing_entry:
        # Idempotent response for duplicates
        return WaitlistResponse(
            id=str(existing_entry.id),
            email=existing_entry.email,
            message="Already on the waitlist",
        )

    # Create new entry
    new_entry = WaitlistEntry(email=payload.email)
    db.add(new_entry)
    await db.commit()
    await db.refresh(new_entry)

    return WaitlistResponse(
        id=str(new_entry.id),
        email=new_entry.email,
        message="Successfully joined the waitlist",
    )
