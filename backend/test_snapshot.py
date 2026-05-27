import asyncio
from core.database import async_session_factory
from portfolio_evolution.service import PortfolioEvolutionService
from models.user import User
from sqlmodel import select

async def main():
    async with async_session_factory() as db:
        result = await db.execute(select(User))
        user = result.scalars().first()
        if not user:
            print("No users found.")
            return

        snapshot = await PortfolioEvolutionService.generate_snapshot(user.id, db)
        print("Snapshot Primary Narrative:", snapshot.primary_narrative)
        print("Evolution Observations:", snapshot.evolution_observations)
        print("Topology Insights:", snapshot.topology_insights)
        print("Strategy Reflections:", snapshot.strategy_reflections)

if __name__ == "__main__":
    asyncio.run(main())
