from pydantic import BaseModel
from typing import Optional

class CanonicalMerchant(BaseModel):
    """
    The normalized, authoritative representation of a merchant.
    """
    canonical_name: str
    display_name: str
    category: str
    subcategory: Optional[str] = None
    confidence_score: float
