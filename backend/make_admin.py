"""
DEVELOPMENT-ONLY utility: promotes all users or a specific user to ADMIN.

WARNING: This script operates on ALL users by default. Do NOT run in production.
Use --email to target a single user, or use the interactive confirmation prompt.
"""

import argparse
import asyncio
import sys

from core.database import async_session_factory
from models.enums import UserRole
from models.user import User
from sqlmodel import select


async def make_all_users_admin() -> None:
    """Promote EVERY user in the database to ADMIN. Requires explicit confirmation."""
    print("⚠️  WARNING: This will promote ALL users to ADMIN. This is a dev-only operation.")
    confirm = input("Type 'yes' to confirm: ").strip()
    if confirm != "yes":
        print("Aborted.")
        return

    async with async_session_factory() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        for user in users:
            print(f"Updating user {user.email} from {user.role} to ADMIN")
            user.role = UserRole.ADMIN
            session.add(user)
        await session.commit()
        print(f"Done! Promoted {len(users)} user(s) to ADMIN.")


async def make_user_admin(email: str) -> None:
    """Promote a single user to ADMIN by email address."""
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            print(f"No user found with email: {email}")
            return
        user.role = UserRole.ADMIN
        session.add(user)
        await session.commit()
        print(f"Promoted {user.email} to ADMIN.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Dev-only admin promotion tool")
    parser.add_argument("--email", type=str, help="Promote a single user by email")
    args = parser.parse_args()

    if args.email:
        asyncio.run(make_user_admin(args.email))
    else:
        asyncio.run(make_all_users_admin())
