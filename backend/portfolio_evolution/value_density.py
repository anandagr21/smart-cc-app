from decimal import Decimal
from typing import List
from models.user_card import UserCard

class PortfolioValueDensityEngine:
    """
    Computes value density of the portfolio: realized annual value vs fee burden.
    This helps detect dead-weight cards or highly efficient premium cards.
    """

    @staticmethod
    def compute_value_density(user_cards: List[UserCard]) -> float:
        """
        Calculates the portfolio's value density.
        Value density = Total Value Generated / (Total Effective Fees + 1)
        (Adding 1 to avoid division by zero).
        
        For a more accurate long-term view, this should include milestone value
        and lounge access, but as a baseline we look at spend and fees.
        """
        if not user_cards:
            return 0.0

        total_annual_fee = Decimal("0.00")
        total_estimated_value = Decimal("0.00")

        for card in user_cards:
            fee = card.effective_annual_fee
            total_annual_fee += fee

            # In a fully connected system, we would query the actual reward engine
            # to see how much value this card has generated. For now, we estimate
            # a baseline 1.5% return on annual spend + milestone proxies.
            # E.g., baseline value = annual_spend * 0.015
            baseline_value = card.annual_spend * Decimal("0.015")
            
            # If fee is 0, the card is highly dense by default if it has spend.
            total_estimated_value += baseline_value
        
        # Value density score
        # > 1.0 means net positive value vs fees.
        # < 1.0 means fees might outweigh the value generated.
        
        density = float(total_estimated_value) / (float(total_annual_fee) + 1.0)
        return min(max(density, 0.0), 10.0) # cap at 10.0 for normalization
