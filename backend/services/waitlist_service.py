from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from models.waitlist import WaitlistEntry
from schemas.waitlist import WaitlistCreate, WaitlistResponse

class WaitlistService:
    @staticmethod
    async def join_waitlist(db: AsyncSession, payload: WaitlistCreate) -> WaitlistResponse:
        statement = select(WaitlistEntry).where(WaitlistEntry.email == payload.email)
        result = await db.execute(statement)
        existing_entry = result.scalar_one_or_none()

        if existing_entry:
            return WaitlistResponse(
                id=str(existing_entry.id),
                email=existing_entry.email,
                message="Already on the waitlist",
            )

        new_entry = WaitlistEntry(email=payload.email)
        db.add(new_entry)
        await db.commit()
        await db.refresh(new_entry)

        return WaitlistResponse(
            id=str(new_entry.id),
            email=new_entry.email,
            message="Successfully joined the waitlist",
        )
