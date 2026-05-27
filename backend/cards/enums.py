from enum import Enum

class CardStatus(str, Enum):
    """
    Future-safe state model for credit cards.
    """
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    LOCKED = "LOCKED"
    CLOSED = "CLOSED"
    EXPIRED = "EXPIRED"

def is_card_eligible_for_recommendation(status: str | CardStatus) -> bool:
    """
    Only ACTIVE cards can be optimized or recommended.
    """
    return status == CardStatus.ACTIVE

def is_card_selectable(status: str | CardStatus) -> bool:
    """
    Whether the card can be manually selected in a form.
    """
    return status == CardStatus.ACTIVE

def is_card_visible_in_wallet(status: str | CardStatus) -> bool:
    """
    Whether the card should be displayed in the user's wallet overview.
    (Closed cards might eventually be hidden, but for now we keep them visible).
    """
    return status in (CardStatus.ACTIVE, CardStatus.INACTIVE, CardStatus.LOCKED, CardStatus.EXPIRED)

class OptimizationPersonality(str, Enum):
    """
    The strategic financial philosophy of the user. 
    Used to shift the recommendation engine's priorities and adapt UI coaching.
    """
    MAXIMIZE_REWARDS = "MAXIMIZE_REWARDS"
    TRAVEL_OPTIMIZATION = "TRAVEL_OPTIMIZATION"
    FEE_MINIMIZATION = "FEE_MINIMIZATION"
    BALANCED_INTELLIGENCE = "BALANCED_INTELLIGENCE"
    WALLET_SIMPLICITY = "WALLET_SIMPLICITY"
