from datetime import date
from typing import Any
from decimal import Decimal

from cards.schemas import MilestoneProgress

class MilestoneEngine:
    
    @staticmethod
    def evaluate_card_milestones(user_card: Any, recent_transactions: list[Any]) -> list[MilestoneProgress]:
        """
        Evaluate milestone progress for a given user card using its configured milestones.
        recent_transactions should contain transactions from the current billing cycle/month.
        """
        # Fetch milestones from the nested catalog
        catalog = getattr(user_card, "card_catalog", getattr(user_card, "card_details", None))
        if not catalog:
            return []
            
        milestones_data = getattr(catalog, "milestones_json", {}) or {}
        if isinstance(milestones_data, list):
            milestones = milestones_data
        else:
            milestones = milestones_data.get("milestones", [])
            
        if not milestones:
            return []
            
        results = []
        
        current_spend = getattr(user_card, "current_spend", Decimal("0.00"))
        annual_spend = getattr(user_card, "annual_spend", Decimal("0.00"))
        
        for m in milestones:
            period = str(m.get("period", "MONTHLY")).upper()
            
            # Determine Target Type
            if "transaction_count" in m:
                target_type = "TRANSACTION_COUNT"
                target_value = Decimal(m["transaction_count"])
                min_amount = Decimal(m.get("transaction_amount", 0))
                
                # Count matching transactions
                current_value = Decimal(0)
                for txn in recent_transactions:
                    amt = getattr(txn, "amount", Decimal("0"))
                    if amt >= min_amount:
                        current_value += 1
                        
            elif "spend_threshold" in m:
                target_type = "SPEND"
                target_value = Decimal(m["spend_threshold"])
                min_amount = None
                
                if period == "MONTHLY":
                    current_value = Decimal(current_spend)
                else:
                    current_value = Decimal(annual_spend)
            else:
                continue # Unknown milestone type
                
            is_achieved = current_value >= target_value
            progress = min(100.0, float(current_value / target_value) * 100.0) if target_value > 0 else 0.0
            
            results.append(MilestoneProgress(
                period=period,
                target_type=target_type,
                target_value=target_value,
                min_transaction_amount=min_amount,
                current_value=current_value,
                is_achieved=is_achieved,
                progress_percentage=progress,
                bonus_points=m.get("bonus_points"),
                fee_waiver=m.get("fee_waiver"),
                fee_waiver_percent=m.get("fee_waiver_percent")
            ))
            
        return results
