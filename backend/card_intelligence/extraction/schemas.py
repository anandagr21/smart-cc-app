from typing import Optional, List, Literal
from pydantic import BaseModel, Field

class BaseExtraction(BaseModel):
    source_chunk: str = Field(description="The exact text snippet from the document that supports this extraction. Must be an exact quote.")
    page: int = Field(description="The page number where this information was found (1-indexed).")

class FeeRule(BaseExtraction):
    amount: float = Field(description="The fee amount in INR")
    
class FeeWaiverRule(BaseExtraction):
    spend_threshold: float = Field(description="The annual spend required to waive the fee")

class PointValuation(BaseExtraction):
    point_value_inr: float = Field(description="The monetary value of 1 point in INR (e.g., 0.25 if 1 point = Rs 0.25). If not specified, default to 1.0.")

# 1. Strict relational schema definition for the math engine
class RewardRule(BaseModel):
    category_name: str = Field(description="e.g., Dining, Fuel, Online Partners, Catch-all")
    multiplier: float = Field(description="The point multiplier or direct cashback percentage value (e.g. 10.0 for 10x or 5.0 for 5%)")
    reward_type: Literal["points", "cashback", "miles"]
    has_cap: bool
    cap_limit: Optional[float] = Field(None, description="Max spend or reward units allowed in this specific tier per cycle")
    cap_cycle: Optional[Literal["monthly", "statement", "annual"]] = None
    merchant_exclusions: List[str] = Field(default=[], description="Explicitly excluded vendors or categories from this rule mentioned in footnotes")

class CardMilestone(BaseModel):
    spend_target: float = Field(description="Total cumulative spend required to trigger the bonus reward")
    reward_payout: str = Field(description="Description of the voucher or bonus, e.g., 'Rs. 2000 Amazon Voucher'")
    cycle: Literal["monthly", "quarterly", "annual"]

class StructuredCardData(BaseModel):
    card_name: str
    bank_issuer: str
    currency: str = "INR"
    base_reward_rate_per_100: float = Field(description="Standard baseline reward rate per 100 units spent when no categories apply")
    annual_fee: Optional[float] = Field(default=None, description="The annual or renewal fee amount in INR. Null if lifetime free.")
    joining_fee: Optional[float] = Field(default=None, description="The joining or issuance fee amount in INR")
    fee_waiver_spend_threshold: Optional[float] = Field(default=None, description="The annual spend required to waive the annual fee")
    reward_rules: List[RewardRule]
    milestones: List[CardMilestone]

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
    
    point_valuation: Optional[PointValuation] = Field(default=None)
    
    annual_fee: Optional[FeeRule] = Field(default=None)
    joining_fee: Optional[FeeRule] = Field(default=None)
    fee_waiver: Optional[FeeWaiverRule] = Field(default=None)

    reward_rules: List[RewardRule] = Field(default_factory=list)
    exclusions: List[ExclusionRule] = Field(default_factory=list)
    benefits: List[BenefitRule] = Field(default_factory=list)
    milestones: List[MilestoneRule] = Field(default_factory=list)
