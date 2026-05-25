import re

with open("tests/unit/test_caps.py", "r") as f:
    content = f.read()

# Replace headrooms = ... where it was passing cumulative_earned.
replacements = {
    # limit 1500, earned 1450 -> remaining 50
    'headrooms = {"monthly_cap::monthly::": Decimal("1450")}': 
    'headrooms = {"monthly_cap::monthly::": Decimal("50")}',
    
    # 500 earned, limit 1000? Let's check test_reward_zero_after_prior_caps
    # Actually it's easier to just do it manually if it's 14 of them.
}

