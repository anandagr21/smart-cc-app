"""
Module: backend.recommendations.utils
Responsibility: Pure helpers for recommendations orchestration.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from recommendations.schemas import RecommendationRequest
from reward_engine.constants import PaymentMode
from reward_engine.schemas import TransactionContext, NormalizedRuleConfig


def build_transaction_context(
    request: RecommendationRequest,
    canonical_merchant: str,
    category: str,
) -> TransactionContext:
    """Build a TransactionContext from a user request and normalized merchant details.

    Infers `is_online` from payment_mode.
    Uses today's date if transaction_date is omitted.
    """
    is_online = request.payment_mode == PaymentMode.ONLINE
    txn_date = request.transaction_date or date.today()
    
    # We pass 'any' to payment_mode string if we aren't sure,
    # but request.payment_mode will be an enum or string.
    pm_value = request.payment_mode.value if hasattr(request.payment_mode, "value") else str(request.payment_mode)

    return TransactionContext(
        merchant=canonical_merchant,
        category=category,
        amount=request.amount,
        payment_mode=pm_value,
        transaction_date=txn_date,
        is_online=is_online,
        mcc_code=request.mcc_code,
        cumulative_spend=0,  # Could be hydrated from analytics module later
    )


def get_catalog_card(user_card: Any) -> Any:
    """Safely extract the catalog card definition (template) from a UserCard.

    Handles both UserCardResponse (which has `card_details` attribute)
    and UserCard database ORM models (which has `card_catalog` relationship).
    """
    if not user_card:
        return None
    return getattr(user_card, "card_details", None) or getattr(user_card, "card_catalog", None)


def get_card_name(user_card: Any) -> str:
    """Resolve the display name for a user card."""
    if not user_card:
        return "Unknown Card"
    nickname = getattr(user_card, "nickname", None)
    if nickname:
        return nickname
    catalog_card = get_catalog_card(user_card)
    if catalog_card:
        return getattr(catalog_card, "card_name", "Unknown Card")
    return "Unknown Card"

def parse_rules_from_catalog(catalog_card: Any, card_name: str) -> list[NormalizedRuleConfig]:
    """Parse JSON rules from a CardCatalog model/schema into NormalizedRuleConfig instances."""
    if not catalog_card:
        return []
        
    normalized_rules = []
    raw_rules = getattr(catalog_card, "reward_rules_json", []) or []
    if isinstance(raw_rules, dict) and "rules" in raw_rules:
        raw_rules = raw_rules["rules"]
        
    base_point_value = float(getattr(catalog_card, "base_point_value", 1.0) or 1.0)
        
    for r in raw_rules:
        category = str(r.get("category_name", "other"))
        r_type = str(r.get("reward_type", "cashback")).lower()
        multiplier = float(r.get("multiplier", 0.0))
        
        config = {
            "reward_type": r_type,
            "reward_rate": (multiplier / 100.0) if r_type == "cashback" else 0.0,
            "points_multiplier": multiplier if r_type != "cashback" else 1.0,
            "rupee_value": base_point_value,
            "spend_unit": 100,
            "payment_mode": "any",
            "cap": float(r.get("cap_limit", 0) or 0) if r.get("has_cap") else 0.0,
            "scope": "monthly" if r.get("cap_cycle") == "monthly" else "transaction",
            "excluded_merchants": r.get("merchant_exclusions", []),
        }
        
        category_lower = category.lower()
        is_base = any(b in category_lower for b in ["catch", "other", "base", "all spend", "any spend", "default"])
        
        rule_type = "category_bonus" if not is_base else "base_reward"
        priority = 10 if not is_base else 100
        
        if not is_base:
            # Determine if this is a strict merchant rule vs a broader category rule with examples
            is_category = any(w in category_lower for w in ["online", "shopping", "spends", "category", "etc"])
            
            merchant_keywords = ["amazon", "flipkart", "myntra", "zomato", "swiggy", "makemytrip", "cleartrip", "bigbasket"]
            found_merchants = [m for m in merchant_keywords if m in category_lower]
            
            if found_merchants and not is_category:
                config["merchant"] = found_merchants[0]
                rule_type = "merchant_bonus"
                priority = 1
            else:
                # Map LLM human-readable strings to canonical categories
                if any(w in category_lower for w in ["dining", "restaurant"]):
                    config["category"] = "dining"
                elif "food" in category_lower:
                    config["category"] = "food"
                elif any(w in category_lower for w in ["travel", "flight", "hotel"]):
                    config["category"] = "travel"
                elif any(w in category_lower for w in ["fuel", "petrol", "gas"]):
                    config["category"] = "fuel"
                elif any(w in category_lower for w in ["grocery", "groceries", "supermarket"]):
                    config["category"] = "grocery"
                elif any(w in category_lower for w in ["utility", "utilities", "bill"]):
                    config["category"] = "utilities"
                elif any(w in category_lower for w in ["online", "shopping"]):
                    config["category"] = "ecommerce"
                else:
                    config["category"] = category
        
        normalized_rules.append(
            NormalizedRuleConfig(
                rule_name=f"{card_name} - {category}",
                rule_type=rule_type,
                priority=priority,
                config=config,
            )
        )
        
    return normalized_rules

