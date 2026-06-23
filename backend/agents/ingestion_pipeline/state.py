from typing import TypedDict, List, Dict, Any, Optional
from uuid import UUID

class ValidationFailure(TypedDict):
    field: str
    expected: Any
    found: Any
    reason: str

class ValidationReport(TypedDict):
    status: str # "PASSED" or "FAILED"
    failures: List[ValidationFailure]
    markdown_content: str
    confidence: float

class IngestionState(TypedDict):
    existing_card_names: List[str]
    target_card: Optional[str]
    discovered_cards: List[Dict[str, Any]]
    inserted_cards: List[Dict[str, Any]] # Contains card_id and mapped data
    validation_reports: Dict[str, ValidationReport] # Map from card_id to report
    cards_to_fix: List[str] # List of card_ids that need fixing
    fix_retries: Dict[str, int] # Map from card_id to number of retries
