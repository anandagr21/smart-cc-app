import asyncio
from core.database import async_session_factory
from models.user import User
from models.enums import UserRole
from sqlmodel import select

async def make_all_users_admin():
    async with async_session_factory() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        for user in users:
            print(f"Updating user {user.email} from {user.role} to ADMIN")
            user.role = UserRole.ADMIN
            session.add(user)
        await session.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(make_all_users_admin())
