from datetime import date
from decimal import Decimal
from typing import Any

def get_waiver_progress(user_card: Any, catalog_card: Any) -> dict[str, Any]:
    """Calculate and project fee waiver status for a user card."""
    annual_spend = user_card.annual_spend or Decimal("0.00")
    catalog_threshold = catalog_card.fee_waiver_spend_threshold
    user_override_threshold = getattr(user_card, "user_override_fee_waiver_threshold", None)
    
    # Effective threshold logic
    if user_override_threshold is not None:
        waiver_threshold = user_override_threshold
    else:
        waiver_threshold = catalog_threshold

    annual_fee = user_card.effective_annual_fee or Decimal("0.00")

    result = {
        "fee_waiver_threshold": catalog_threshold,
        "user_override_fee_waiver_threshold": user_override_threshold,
        "effective_fee_waiver_threshold": waiver_threshold,
        "annual_fee": annual_fee, # Legacy key
        "effective_annual_fee": annual_fee,
        "fee_waiver_progress_percent": 0.0,
        "remaining_spend_for_waiver": None,
        "waiver_achieved": False,
        "projected_waiver_status": "N/A"
    }

    if not waiver_threshold or waiver_threshold <= Decimal("0"):
        return result
        
    if annual_fee <= Decimal("0"):
        result["waiver_achieved"] = True
        result["projected_waiver_status"] = "No Annual Fee"
        return result

    progress = float(annual_spend / waiver_threshold) * 100.0
    result["fee_waiver_progress_percent"] = min(100.0, round(progress, 2))
    
    remaining = waiver_threshold - annual_spend
    result["remaining_spend_for_waiver"] = max(Decimal("0.00"), remaining)
    
    if annual_spend >= waiver_threshold:
        result["waiver_achieved"] = True
        result["projected_waiver_status"] = "Achieved"
        return result
        
    result["waiver_achieved"] = False
    
    # Simple projection based on cycle date
    if user_card.fee_cycle_start_date:
        today = date.today()
        cycle_start = user_card.fee_cycle_start_date
        # Approximate days since cycle start
        try:
            # If the cycle_start is in a previous year, we need to adjust
            # For simplicity, assuming fee_cycle_start_date is just the anniversary date
            days_elapsed = (today - cycle_start).days
            # Modulo 365 to get days in current cycle
            days_in_current_cycle = max(1, days_elapsed % 365)
            
            # Daily spend rate
            daily_spend = float(annual_spend) / days_in_current_cycle
            projected_annual = daily_spend * 365.0
            
            if projected_annual >= float(waiver_threshold):
                result["projected_waiver_status"] = "On Track"
            else:
                result["projected_waiver_status"] = "Falling Behind"
        except Exception:
            result["projected_waiver_status"] = "Unknown"
    else:
        result["projected_waiver_status"] = "Unknown"
        
    return result
