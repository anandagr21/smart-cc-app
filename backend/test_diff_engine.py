import asyncio
import uuid
from typing import List, Any
from card_intelligence.extraction.schemas import (
    CardIntelligenceExtraction,
    RewardRule as ExtractedRewardRule
)
from card_intelligence.models import (
    CardExtractionCandidate,
    CandidateType
)
from card_intelligence.extraction.pipeline import IngestionPipeline
from rewards.models import RewardRule

class MockCard:
    def __init__(self):
        self.annual_fee = None
        self.joining_fee = None
        self.fee_waiver_spend_threshold = None

class MockSource:
    def __init__(self):
        self.card_id = uuid.uuid4()
        self.id = uuid.uuid4()

def run_diff(existing_rules, extraction) -> List[CardExtractionCandidate]:
    pipeline = IngestionPipeline(db=None) 
    source = MockSource()
    card = MockCard()
    return pipeline._generate_candidates(extraction, source, card, existing_rules)

def print_candidates(test_name, candidates):
    print(f"\n--- {test_name} ---")
    if not candidates:
        print("0 candidates generated.")
        return
    for c in candidates:
        print(f"[{c.change_type}] {c.entity_identifier}")
        if c.change_type == "UPDATE":
            print(f"  Current: {c.current_value}")
            print(f"  Proposed: {c.proposed_value}")

def test_1_new_card():
    ext = CardIntelligenceExtraction(
        extracted_card_name="SimplyClick",
        reward_rules=[
            ExtractedRewardRule(
                merchants=["Amazon", "Swiggy", "Cleartrip", "BookMyShow"],
                rate=0.015,
                source_chunk="10X rewards on Amazon, Swiggy, Cleartrip, BookMyShow",
                page=1
            )
        ]
    )
    cands = run_diff([], ext)
    print_candidates("Test 1: New Card", cands)
    assert len(cands) == 4
    assert all(c.change_type == "ADD" for c in cands)

def test_2_reprocess_same():
    existing = [
        RewardRule(rule_name="REWARD_MERCHANT_AMAZON", rule_config={"merchant": "amazon", "reward_type": "cashback", "reward_rate": 0.015}),
        RewardRule(rule_name="REWARD_MERCHANT_SWIGGY", rule_config={"merchant": "swiggy", "reward_type": "cashback", "reward_rate": 0.015}),
    ]
    ext = CardIntelligenceExtraction(
        extracted_card_name="SimplyClick",
        reward_rules=[
            ExtractedRewardRule(
                merchants=["Amazon", "Swiggy"],
                rate=0.015,
                source_chunk="Same text",
                page=1
            )
        ]
    )
    cands = run_diff(existing, ext)
    print_candidates("Test 2: Reprocess Same Document", cands)
    assert len(cands) == 0

def test_3_reward_change():
    existing = [
        RewardRule(rule_name="REWARD_MERCHANT_AMAZON", rule_config={"merchant": "amazon", "reward_type": "cashback", "reward_rate": 0.05}),
    ]
    ext = CardIntelligenceExtraction(
        extracted_card_name="SimplyClick",
        reward_rules=[
            ExtractedRewardRule(
                merchants=["Amazon"],
                rate=0.06,
                source_chunk="Now 6% on Amazon!",
                page=1
            )
        ]
    )
    cands = run_diff(existing, ext)
    print_candidates("Test 3: Reward Change", cands)
    assert len(cands) == 1
    assert cands[0].change_type == "UPDATE"
    assert cands[0].proposed_value["reward_rate"] == 0.06

def test_4_missing_rule():
    existing = [
        RewardRule(rule_name="REWARD_MERCHANT_AMAZON", rule_config={"merchant": "amazon", "reward_type": "cashback", "reward_rate": 0.05}),
        RewardRule(rule_name="REWARD_MERCHANT_SWIGGY", rule_config={"merchant": "swiggy", "reward_type": "cashback", "reward_rate": 0.05}),
        RewardRule(rule_name="REWARD_MERCHANT_CLEARTRIP", rule_config={"merchant": "cleartrip", "reward_type": "cashback", "reward_rate": 0.10}),
    ]
    ext = CardIntelligenceExtraction(
        extracted_card_name="SimplyClick",
        reward_rules=[
            ExtractedRewardRule(merchants=["Amazon", "Swiggy"], rate=0.05, source_chunk="", page=1)
        ]
    )
    cands = run_diff(existing, ext)
    print_candidates("Test 4: Missing Rule", cands)
    assert len(cands) == 1
    assert cands[0].change_type == "STALE"
    assert cands[0].entity_identifier == "REWARD_MERCHANT_CLEARTRIP"

def test_5_merchant_normalization():
    existing = [
        RewardRule(rule_name="REWARD_MERCHANT_AMAZON", rule_config={"merchant": "amazon", "reward_type": "cashback", "reward_rate": 0.05}),
    ]
    ext = CardIntelligenceExtraction(
        extracted_card_name="SimplyClick",
        reward_rules=[
            ExtractedRewardRule(merchants=["Amazon India Pvt. Ltd."], rate=0.06, source_chunk="", page=1)
        ]
    )
    cands = run_diff(existing, ext)
    print_candidates("Test 5: Merchant Normalization", cands)
    assert len(cands) == 1
    assert cands[0].change_type == "UPDATE"
    assert cands[0].entity_identifier == "REWARD_MERCHANT_AMAZON"
    assert cands[0].proposed_value["merchant"] == "amazon"

if __name__ == "__main__":
    test_1_new_card()
    test_2_reprocess_same()
    test_3_reward_change()
    test_4_missing_rule()
    test_5_merchant_normalization()
    print("\nAll tests passed successfully!")
