"""
Module: backend.merchants.constants
Responsibility: Category enums and normalization constants for merchant processing.

Architectural Boundaries:
- Pure constants only — no I/O, no business logic.
- Used by normalizer, categorizer, and matcher modules.
- Shared across the merchant domain.

TODO:
- Consider moving to a database-driven category list for admin configurability.
"""

from enum import Enum


class MerchantCategory(str, Enum):
    """Deterministic merchant categories for reward evaluation.

    Each raw merchant name maps to exactly one category. Adding a new
    category requires updating the CATEGORY_RULES mapping in categorizer.py.

    Categories are used by the reward engine for category-based cashback
    multipliers and offer matching.
    """

    FOOD = "food"
    GROCERY = "grocery"
    FUEL = "fuel"
    TRAVEL = "travel"
    ECOMMERCE = "ecommerce"
    UTILITIES = "utilities"
    ENTERTAINMENT = "entertainment"
    DINING = "dining"
    INSURANCE = "insurance"
    TELECOM = "telecom"
    UNKNOWN = "unknown"


# ---------------------------------------------------------------------------
# Normalization Rules
# ---------------------------------------------------------------------------

# Suffixes stripped during normalization. These are common corporate suffixes
# that add no meaningful signal for merchant identification.
# Type / category descriptor words that carry no merchant identity.
# These are stripped during normalization because they describe what the
# merchant sells, not who the merchant is.
#
# Examples:
#   "DOMINOS PIZZA" → strip "pizza" → "dominos"
#   "IRCTC RAIL"   → strip "rail"   → "irctc"
#
# Note: "pay" is intentionally excluded — it is brand-relevant
# (e.g., "Amazon Pay", "Paytm").
DESCRIPTOR_WORDS: frozenset[str] = frozenset(
    {
        "pizza",
        "rail",
        "railway",
        "restaurant",
        "hotel",
        "food",
        "store",
        "shop",
        "mart",
        "cafe",
        "bar",
        "bakery",
        "sweet",
        "sweets",
        "fast",
        "foods",
        "grill",
        "kitchen",
        "dhaba",
        "bistro",
        "diner",
    }
)

COMMON_SUFFIXES: frozenset[str] = frozenset(
    {
        "ltd",
        "limited",
        "pvt",
        "private",
        "india",
        "online",
        "global",
        "inc",
        "corp",
        "corporation",
        "llp",
        "llc",
        "services",
        "solutions",
        "technologies",
        "tech",
        "international",
        "retail",
        "enterprises",
        "group",
        "ventures",
        "holdings",
        "platforms",
    }
)

# Words removed entirely during normalization — generic filler terms
# that appear in raw merchant names but carry zero identity signal.
UNKNOWN_CATEGORY = MerchantCategory.UNKNOWN

# Words that carry zero identity signal and should be removed entirely.
# "pay" is intentionally NOT in this list — it is brand-relevant
# (e.g., "Amazon Pay", "Paytm", "Google Pay").
STOP_WORDS: frozenset[str] = frozenset(
    {
        "payment",
        "via",
        "through",
        "using",
        "for",
        "and",
        "of",
        "the",
        "in",
        "at",
        "by",
        "from",
        "to",
        "with",
        "on",
    }
)

# Punctuation characters stripped during normalization.
# All non-alphanumeric characters except spaces are covered.
PUNCTUATION_TABLE: dict[int, int | None] = str.maketrans(
    "", "", "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
)