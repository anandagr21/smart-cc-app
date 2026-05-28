from decimal import Decimal
from typing import Optional

class WaiverProjections:
    """
    Deterministic projection engine to estimate likelihood of reaching the fee waiver
    based on current spending velocity.
    """
    
    @staticmethod
    def project_completion_probability(
        current_spend: Decimal,
        waiver_target: Decimal,
        days_elapsed: int,
        days_remaining: int
    ) -> float:
        """
        Calculates the probability of hitting the waiver naturally based on spend velocity.
        """
        if current_spend >= waiver_target:
            return 1.0
            
        if days_remaining <= 0:
            return 0.0
            
        if days_elapsed <= 0:
            # Not enough data, assume a flat 50% probability to start
            return 0.5
            
        daily_velocity = float(current_spend) / days_elapsed
        projected_spend = float(current_spend) + (daily_velocity * days_remaining)
        
        target = float(waiver_target)
        
        # If the projected spend is greater than target, probability is high
        if projected_spend >= target:
            # Margin of safety
            margin = projected_spend / target
            if margin > 1.2:
                return 0.95
            elif margin > 1.05:
                return 0.85
            return 0.75
            
        # If falling short
        shortfall = target - projected_spend
        # How much is the shortfall relative to remaining spend potential?
        if shortfall / target < 0.1:
            return 0.4 # Close, could still happen
        elif shortfall / target < 0.3:
            return 0.2 # Needs significant attention
            
        return 0.05 # Highly unlikely
