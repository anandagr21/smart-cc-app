"""
Module: backend.merchants.categorizer
Responsibility: Deterministic category mapping from normalized merchant names.

Architectural Boundaries:
- Pure functions only — no I/O, no database, no AI.
- Maps normalized merchant names/tokens to predefined categories.
- Category rules are maintainable and explicit — no opaque logic.

TODO:
- Extract category rules to an admin-configurable data source.
- Add ML-based category suggestion alongside deterministic rules
  (hybrid approach — deterministic always wins for known merchants).
"""

from __future__ import annotations

from typing import Mapping
from functools import lru_cache

from merchants.constants import MerchantCategory

# ---------------------------------------------------------------------------
# Category Rules
# ---------------------------------------------------------------------------
# Each rule maps a canonical merchant name (or partial name) to a category.
# Rules are applied in order — the first matching rule wins.
# Keys are normalized canonical names (post-normalization).
# ---------------------------------------------------------------------------

_CATEGORY_RULES: Mapping[str, MerchantCategory] = {
    # --- Food / Dining ---
    "dominos": MerchantCategory.FOOD,
    "dominos pizza": MerchantCategory.FOOD,
    "mcdonalds": MerchantCategory.FOOD,
    "burger king": MerchantCategory.FOOD,
    "kfc": MerchantCategory.FOOD,
    "subway": MerchantCategory.FOOD,
    "pizza hut": MerchantCategory.FOOD,
    "swiggy": MerchantCategory.FOOD,
    "zomato": MerchantCategory.FOOD,
    "ubereats": MerchantCategory.FOOD,
    "doordash": MerchantCategory.FOOD,
    "taco bell": MerchantCategory.FOOD,
    # --- Grocery ---
    "blinkit": MerchantCategory.GROCERY,
    "bigbasket": MerchantCategory.GROCERY,
    "zepto": MerchantCategory.GROCERY,
    "instamart": MerchantCategory.GROCERY,
    "jiomart": MerchantCategory.GROCERY,
    "dmart": MerchantCategory.GROCERY,
    "walmart": MerchantCategory.GROCERY,
    "costco": MerchantCategory.GROCERY,
    "whole foods": MerchantCategory.GROCERY,
    "kroger": MerchantCategory.GROCERY,
    "safeway": MerchantCategory.GROCERY,
    "target": MerchantCategory.GROCERY,
    # --- Fuel ---
    "indianoil": MerchantCategory.FUEL,
    "bharat petroleum": MerchantCategory.FUEL,
    "hp petrol": MerchantCategory.FUEL,
    "shell": MerchantCategory.FUEL,
    "bp": MerchantCategory.FUEL,
    "exxon": MerchantCategory.FUEL,
    "chevron": MerchantCategory.FUEL,
    "mobil": MerchantCategory.FUEL,
    "hpcl": MerchantCategory.FUEL,
    "iocl": MerchantCategory.FUEL,
    "bharatgas": MerchantCategory.FUEL,
    "indane": MerchantCategory.FUEL,
    # --- Travel ---
    "irctc": MerchantCategory.TRAVEL,
    "makemytrip": MerchantCategory.TRAVEL,
    "goibibo": MerchantCategory.TRAVEL,
    "yatra": MerchantCategory.TRAVEL,
    "cleartrip": MerchantCategory.TRAVEL,
    "indigo": MerchantCategory.TRAVEL,
    "air india": MerchantCategory.TRAVEL,
    "spicejet": MerchantCategory.TRAVEL,
    "vistara": MerchantCategory.TRAVEL,
    "akasa": MerchantCategory.TRAVEL,
    "uber": MerchantCategory.TRAVEL,
    "ola": MerchantCategory.TRAVEL,
    "ola cabs": MerchantCategory.TRAVEL,
    "rapido": MerchantCategory.TRAVEL,
    "redbus": MerchantCategory.TRAVEL,
    "irctc rail": MerchantCategory.TRAVEL,
    # --- Ecommerce ---
    "amazon": MerchantCategory.ECOMMERCE,
    "amazon pay": MerchantCategory.ECOMMERCE,
    "flipkart": MerchantCategory.ECOMMERCE,
    "myntra": MerchantCategory.ECOMMERCE,
    "ajio": MerchantCategory.ECOMMERCE,
    "meesho": MerchantCategory.ECOMMERCE,
    "nykaa": MerchantCategory.ECOMMERCE,
    "shopclues": MerchantCategory.ECOMMERCE,
    "snapdeal": MerchantCategory.ECOMMERCE,
    "tatacliq": MerchantCategory.ECOMMERCE,
    "ebay": MerchantCategory.ECOMMERCE,
    "alibaba": MerchantCategory.ECOMMERCE,
    "shopify": MerchantCategory.ECOMMERCE,
    "etsy": MerchantCategory.ECOMMERCE,
    "firstcry": MerchantCategory.ECOMMERCE,
    "lenskart": MerchantCategory.ECOMMERCE,
    # --- Utilities ---
    "adani electricity": MerchantCategory.UTILITIES,
    "tata power": MerchantCategory.UTILITIES,
    "bses": MerchantCategory.UTILITIES,
    "brihanmumbai": MerchantCategory.UTILITIES,
    "bwssb": MerchantCategory.UTILITIES,
    "nebula": MerchantCategory.UTILITIES,
    "mahanagar gas": MerchantCategory.UTILITIES,
    # --- Entertainment ---
    "bookmyshow": MerchantCategory.ENTERTAINMENT,
    "pvr": MerchantCategory.ENTERTAINMENT,
    "inox": MerchantCategory.ENTERTAINMENT,
    "netflix": MerchantCategory.ENTERTAINMENT,
    "amazon prime": MerchantCategory.ENTERTAINMENT,
    "hotstar": MerchantCategory.ENTERTAINMENT,
    "disney": MerchantCategory.ENTERTAINMENT,
    "spotify": MerchantCategory.ENTERTAINMENT,
    "youtube": MerchantCategory.ENTERTAINMENT,
    "sonyliv": MerchantCategory.ENTERTAINMENT,
    "zee5": MerchantCategory.ENTERTAINMENT,
    # --- Dining (restaurant aggregators / specific dining brands) ---
    "dineout": MerchantCategory.DINING,
    "eazydiner": MerchantCategory.DINING,
    "barbeque nation": MerchantCategory.DINING,
    "mainland china": MerchantCategory.DINING,
    # --- Insurance ---
    "lic": MerchantCategory.INSURANCE,
    "hdfc life": MerchantCategory.INSURANCE,
    "icici prudential": MerchantCategory.INSURANCE,
    "max life": MerchantCategory.INSURANCE,
    "sbi life": MerchantCategory.INSURANCE,
    "bajaj allianz": MerchantCategory.INSURANCE,
    "tata aia": MerchantCategory.INSURANCE,
    "acko": MerchantCategory.INSURANCE,
    "policybazaar": MerchantCategory.INSURANCE,
    "coverfox": MerchantCategory.INSURANCE,
    # --- Telecom ---
    "jio": MerchantCategory.TELECOM,
    "airtel": MerchantCategory.TELECOM,
    "vi": MerchantCategory.TELECOM,
    "vodafone": MerchantCategory.TELECOM,
    "bsnl": MerchantCategory.TELECOM,
    "mtnl": MerchantCategory.TELECOM,
    "idea": MerchantCategory.TELECOM,
    "tatasky": MerchantCategory.TELECOM,
    "d2h": MerchantCategory.TELECOM,
    "dish tv": MerchantCategory.TELECOM,
    "act fibernet": MerchantCategory.TELECOM,
    "hathway": MerchantCategory.TELECOM,
    "excitel": MerchantCategory.TELECOM,
}

# Token-level category hints: when a normalized name contains a token
# that strongly signals a category, use this as fallback.
_TOKEN_HINTS: Mapping[str, MerchantCategory] = {
    "pizza": MerchantCategory.FOOD,
    "burger": MerchantCategory.FOOD,
    "restaurant": MerchantCategory.DINING,
    "cafe": MerchantCategory.DINING,
    "coffee": MerchantCategory.DINING,
    "bistro": MerchantCategory.DINING,
    "hotel": MerchantCategory.TRAVEL,
    "flight": MerchantCategory.TRAVEL,
    "airways": MerchantCategory.TRAVEL,
    "airlines": MerchantCategory.TRAVEL,
    "railway": MerchantCategory.TRAVEL,
    "metro": MerchantCategory.TRAVEL,
    "petrol": MerchantCategory.FUEL,
    "diesel": MerchantCategory.FUEL,
    "fuel": MerchantCategory.FUEL,
    "gas": MerchantCategory.FUEL,
    "oil": MerchantCategory.FUEL,
    "cn": MerchantCategory.FUEL,  # CNG
    "cng": MerchantCategory.FUEL,
    "pump": MerchantCategory.FUEL,
    "grocery": MerchantCategory.GROCERY,
    "mart": MerchantCategory.GROCERY,
    "supermarket": MerchantCategory.GROCERY,
    "provision": MerchantCategory.GROCERY,
    "bazaar": MerchantCategory.GROCERY,
    "store": MerchantCategory.GROCERY,
    "pharmacy": MerchantCategory.GROCERY,
    "medical": MerchantCategory.GROCERY,
    "chemist": MerchantCategory.GROCERY,
    "insurance": MerchantCategory.INSURANCE,
    "assurance": MerchantCategory.INSURANCE,
    "life": MerchantCategory.INSURANCE,
    "health": MerchantCategory.INSURANCE,
    "movie": MerchantCategory.ENTERTAINMENT,
    "cinema": MerchantCategory.ENTERTAINMENT,
    "theatre": MerchantCategory.ENTERTAINMENT,
    "games": MerchantCategory.ENTERTAINMENT,
    "gaming": MerchantCategory.ENTERTAINMENT,
    "broadband": MerchantCategory.TELECOM,
    "fiber": MerchantCategory.TELECOM,
    "mobile": MerchantCategory.TELECOM,
    "sim": MerchantCategory.TELECOM,
    "recharge": MerchantCategory.TELECOM,
    "electricity": MerchantCategory.UTILITIES,
    "water": MerchantCategory.UTILITIES,
    "sewerage": MerchantCategory.UTILITIES,
    "municipal": MerchantCategory.UTILITIES,
    "corporation": MerchantCategory.UTILITIES,
    "shopping": MerchantCategory.ECOMMERCE,
    "retail": MerchantCategory.ECOMMERCE,
    "fashion": MerchantCategory.ECOMMERCE,
    "apparel": MerchantCategory.ECOMMERCE,
}


@lru_cache(maxsize=1024)
def categorize(normalized_name: str) -> MerchantCategory:
    """Determine the merchant category from a normalized merchant name.

    Applies rule matching in priority order:
        1. Exact normalized name match in category rules
        2. Token-level hints from the normalized name
        3. Default: MerchantCategory.UNKNOWN

    Args:
        normalized_name: A normalized merchant name string (output of normalize()).

    Returns:
        The best-matching MerchantCategory.

    Examples:
        >>> categorize("dominos pizza")
        <MerchantCategory.FOOD: 'food'>
        >>> categorize("amazon pay")
        <MerchantCategory.ECOMMERCE: 'ecommerce'>
        >>> categorize("irctc rail")
        <MerchantCategory.TRAVEL: 'travel'>
        >>> categorize("xyz unknown merchant")
        <MerchantCategory.UNKNOWN: 'unknown'>
    """
    if not normalized_name:
        return MerchantCategory.UNKNOWN

    # Priority 1: Exact match in category rules.
    category: MerchantCategory | None = _CATEGORY_RULES.get(normalized_name.strip())
    if category is not None:
        return category

    # Priority 2: Token-level hints.
    return categorize_by_tokens(normalized_name)


def categorize_by_tokens(normalized_name: str) -> MerchantCategory:
    """Determine category by searching token-level hints in the normalized name.

    Splits the normalized name into tokens and returns the first category
    that matches any token. If no token matches, returns MerchantCategory.UNKNOWN.

    This function can be called independently when the caller already has a
    normalized name (rather than a full raw name) — avoids re-normalization.

    Args:
        normalized_name: A normalized merchant name (space-separated tokens).

    Returns:
        The best-matching MerchantCategory based on token hints, or UNKNOWN.

    Examples:
        >>> categorize_by_tokens("some random pizza place")
        <MerchantCategory.FOOD: 'food'>
        >>> categorize_by_tokens("metro travel card")
        <MerchantCategory.TRAVEL: 'travel'>
        >>> categorize_by_tokens("completely unknown shop")
        <MerchantCategory.UNKNOWN: 'unknown'>
    """
    if not normalized_name:
        return MerchantCategory.UNKNOWN

    tokens: list[str] = normalized_name.strip().split()

    # Exact token match
    for token in tokens:
        hint: MerchantCategory | None = _TOKEN_HINTS.get(token)
        if hint is not None:
            return hint

    # Substring fallback: when a token is a compound word (e.g.,
    # "pizzahut"), check if it contains any hint key. This handles
    # missing-space variants without needing every permutation in rules.
    for token in tokens:
        for hint_key, hint_category in _TOKEN_HINTS.items():
            if hint_key in token:
                return hint_category

    return MerchantCategory.UNKNOWN


_CATEGORY_RULES_REVERSED: Mapping[MerchantCategory, list[str]] | None = None


def get_merchants_by_category(category: MerchantCategory) -> list[str]:
    """Return all known canonical merchant names for a given category.

    Useful for admin dashboards and debugging.

    Args:
        category: The category to query.

    Returns:
        A sorted list of canonical merchant names in that category.
    """
    global _CATEGORY_RULES_REVERSED
    if _CATEGORY_RULES_REVERSED is None:
        reversed_map: dict[MerchantCategory, list[str]] = {}
        for name, cat in _CATEGORY_RULES.items():
            reversed_map.setdefault(cat, []).append(name)
        _CATEGORY_RULES_REVERSED = reversed_map
    return sorted(_CATEGORY_RULES_REVERSED.get(category, []))