from models.user_card import UserCard
from .schemas import FeeWaiverState
from .engine import FeeWaiverEngine

class FeeWaiverService:
    @staticmethod
    def get_waiver_state_for_card(user_card: UserCard) -> FeeWaiverState | None:
        return FeeWaiverEngine.evaluate(user_card)
