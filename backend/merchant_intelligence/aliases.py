from merchant_intelligence.categories import MerchantCategory

# A robust deterministic dictionary of known merchant aliases
MERCHANT_ALIASES = {
    # Amazon
    "amazon": {"canonical": "AMAZON", "display": "Amazon", "category": MerchantCategory.ONLINE_SHOPPING},
    "amazon pay": {"canonical": "AMAZON", "display": "Amazon", "category": MerchantCategory.ONLINE_SHOPPING},
    "amazon shopping": {"canonical": "AMAZON", "display": "Amazon", "category": MerchantCategory.ONLINE_SHOPPING},
    "amzn": {"canonical": "AMAZON", "display": "Amazon", "category": MerchantCategory.ONLINE_SHOPPING},
    
    # Swiggy
    "swiggy": {"canonical": "SWIGGY", "display": "Swiggy", "category": MerchantCategory.DINING},
    "swigy": {"canonical": "SWIGGY", "display": "Swiggy", "category": MerchantCategory.DINING},
    "swiggy food": {"canonical": "SWIGGY", "display": "Swiggy", "category": MerchantCategory.DINING},
    "swiggy instamart": {"canonical": "SWIGGY_INSTAMART", "display": "Swiggy Instamart", "category": MerchantCategory.GROCERY},
    
    # Zomato
    "zomato": {"canonical": "ZOMATO", "display": "Zomato", "category": MerchantCategory.DINING},
    "zomato.com": {"canonical": "ZOMATO", "display": "Zomato", "category": MerchantCategory.DINING},
    "blinkit": {"canonical": "BLINKIT", "display": "Blinkit", "category": MerchantCategory.GROCERY},
    
    # Flipkart
    "flipkart": {"canonical": "FLIPKART", "display": "Flipkart", "category": MerchantCategory.ONLINE_SHOPPING},
    
    # Travel
    "uber": {"canonical": "UBER", "display": "Uber", "category": MerchantCategory.TRAVEL},
    "uber india": {"canonical": "UBER", "display": "Uber", "category": MerchantCategory.TRAVEL},
    "ola": {"canonical": "OLA", "display": "Ola", "category": MerchantCategory.TRAVEL},
    "irctc": {"canonical": "IRCTC", "display": "IRCTC", "category": MerchantCategory.TRAVEL},
    "irctc web": {"canonical": "IRCTC", "display": "IRCTC", "category": MerchantCategory.TRAVEL},
    "makemytrip": {"canonical": "MAKEMYTRIP", "display": "MakeMyTrip", "category": MerchantCategory.TRAVEL},
    "mmt": {"canonical": "MAKEMYTRIP", "display": "MakeMyTrip", "category": MerchantCategory.TRAVEL},
    
    # Grocery / Retail
    "reliance": {"canonical": "RELIANCE_RETAIL", "display": "Reliance Retail", "category": MerchantCategory.GROCERY},
    "reliance fresh": {"canonical": "RELIANCE_RETAIL", "display": "Reliance Retail", "category": MerchantCategory.GROCERY},
    "reliance smart": {"canonical": "RELIANCE_RETAIL", "display": "Reliance Retail", "category": MerchantCategory.GROCERY},
    "dmart": {"canonical": "DMART", "display": "DMart", "category": MerchantCategory.GROCERY},
    "bigbasket": {"canonical": "BIGBASKET", "display": "BigBasket", "category": MerchantCategory.GROCERY},
}
