from typing import Optional, List
from pydantic import BaseModel, Field

class BaseExtraction(BaseModel):
    source_chunk: str = Field(description="The exact text snippet from the document that supports this extraction. Must be an exact quote.")
    page: int = Field(description="The page number where this information was found (1-indexed).")

class FeeRule(BaseExtraction):
    amount: float = Field(description="The fee amount in INR")
    
class FeeWaiverRule(BaseExtraction):
    spend_threshold: float = Field(description="The annual spend required to waive the fee")

class RewardRule(BaseExtraction):
    category: str = Field(description="The spend category (e.g., 'Dining', 'Grocery', 'All Spends')")
    rate: float = Field(description="The reward rate as a decimal (e.g., 0.05 for 5%)")
    cap: Optional[float] = Field(default=None, description="The maximum rewards that can be earned in this category per cycle, if any")

class ExclusionRule(BaseExtraction):
    category: str = Field(description="The spend category excluded from rewards (e.g., 'Fuel', 'Wallet Load', 'Rent')")

class BenefitRule(BaseExtraction):
    benefit_type: str = Field(description="The type of benefit (e.g., 'Lounge Access', 'Golf', 'Movie Tickets')")
    description: str = Field(description="Details of the benefit")
    uses_per_year: Optional[int] = Field(default=None, description="Number of times this benefit can be used per year")

class MilestoneRule(BaseExtraction):
    spend_threshold: float = Field(description="The spend required to hit the milestone")
    reward_description: str = Field(description="The reward given for hitting the milestone")

class ExtractionTarget(BaseModel):
    card_id: str
    bank_name: str
    card_name: str
    network: Optional[str] = None

class CardIntelligenceExtraction(BaseModel):
    extracted_card_name: str = Field(description="The specific credit card name that these extracted rules apply to. If the document covers multiple cards, this MUST match the target card name.")
    
    annual_fee: Optional[FeeRule] = Field(default=None)
    joining_fee: Optional[FeeRule] = Field(default=None)
    fee_waiver: Optional[FeeWaiverRule] = Field(default=None)

    reward_rules: List[RewardRule] = Field(default_factory=list)
    exclusions: List[ExclusionRule] = Field(default_factory=list)
    benefits: List[BenefitRule] = Field(default_factory=list)
    milestones: List[MilestoneRule] = Field(default_factory=list)
