from datetime import date
from decimal import Decimal

from reward_engine.constants import MatchType, PaymentMode, RewardType
from reward_engine.matcher import match_rules
from reward_engine.schemas import NormalizedRuleConfig, TransactionContext


def test_match_rules_empty():
    txn = TransactionContext(merchant="amazon", category="shopping", amount=Decimal("100"))
    assert match_rules(txn, []) is None


def test_match_rules_exact_merchant():
    txn = TransactionContext(merchant="amazon", category="shopping", amount=Decimal("100"))
    rule = NormalizedRuleConfig(
        rule_name="Amazon Rule",
        rule_type="merchant_bonus",
        priority=1,
        config={"merchant": "amazon", "reward_rate": 0.05, "reward_type": "cashback"}
    )
    match = match_rules(txn, [rule])
    assert match is not None
    assert match.rule_name == "Amazon Rule"
    assert match.match_type == MatchType.EXACT_MERCHANT


def test_match_rules_priority_and_tie_breaking():
    txn = TransactionContext(merchant="amazon", category="shopping", amount=Decimal("100"))
    
    # 3 rules that apply
    rule1 = NormalizedRuleConfig(
        rule_name="Rule A",
        rule_type="category_bonus",
        priority=1,
        config={"category": "shopping", "reward_rate": 0.02, "reward_type": "cashback"}
    )
    # Rule B has same priority, same specificity (category), but HIGHER rate
    rule2 = NormalizedRuleConfig(
        rule_name="Rule B",
        rule_type="category_bonus",
        priority=1,
        config={"category": "shopping", "reward_rate": 0.05, "reward_type": "cashback"}
    )
    # Rule C has same priority, same specificity, same rate as Rule B, but alphabetically earlier name
    rule3 = NormalizedRuleConfig(
        rule_name="Rule A2",
        rule_type="category_bonus",
        priority=1,
        config={"category": "shopping", "reward_rate": 0.05, "reward_type": "cashback"}
    )
    
    # Regardless of input order, rule3 (A2) should win over rule2 (B) due to alphabetical sort 
    # since priority and specificity and rate are identical. 
    # And both should win over rule1 (A) due to higher rate.
    
    # Test order 1
    match = match_rules(txn, [rule1, rule2, rule3])
    assert match is not None
    assert match.rule_name == "Rule A2"
    
    # Test order 2 (reverse)
    match = match_rules(txn, [rule3, rule2, rule1])
    assert match is not None
    assert match.rule_name == "Rule A2"


def test_match_rules_predicates():
    # Test min spend
    txn = TransactionContext(merchant="zomato", category="dining", amount=Decimal("50"), transaction_date="2024-05-15", payment_mode="upi")
    
    rule_min_spend = NormalizedRuleConfig(
        rule_name="Min Spend 100",
        rule_type="merchant_bonus",
        config={"merchant": "zomato", "min_spend": 100}
    )
    assert match_rules(txn, [rule_min_spend]) is None  # 50 < 100
    
    # Test validity window
    rule_validity = NormalizedRuleConfig(
        rule_name="Valid Dates",
        rule_type="merchant_bonus",
        config={"merchant": "zomato", "valid_from": "2024-06-01", "valid_to": "2024-06-30"}
    )
    assert match_rules(txn, [rule_validity]) is None # 05-15 is not in june
    
    # Test payment mode
    rule_pm = NormalizedRuleConfig(
        rule_name="CC only",
        rule_type="merchant_bonus",
        config={"merchant": "zomato", "payment_mode": "credit_card"}
    )
    assert match_rules(txn, [rule_pm]) is None # upi != credit_card
    
    # Passing all
    rule_pass = NormalizedRuleConfig(
        rule_name="Pass",
        rule_type="merchant_bonus",
        config={"merchant": "zomato", "min_spend": 10, "valid_from": "2024-01-01", "payment_mode": "upi"}
    )
    assert match_rules(txn, [rule_pass]) is not None
