from abc import ABC, abstractmethod

from models.user_card import UserCard
from insights.enrichment.transaction_enrichment import EnrichedTransaction
from insights.schemas import InsightResponse


class InsightGenerator(ABC):
    """
    Base protocol for all Insight Generators.
    Generators MUST NOT query the database directly.
    They receive fully hydrated and normalized context.
    """

    @abstractmethod
    def generate(
        self,
        user_id: str,
        cards: list[UserCard],
        transactions: list[EnrichedTransaction],
    ) -> list[InsightResponse]:
        """
        Generate insights deterministically based on the provided context.
        """
        pass
