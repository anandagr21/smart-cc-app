import re

with open("tests/unit/test_caps.py", "r") as f:
    text = f.read()

# 1. Fix test_reward_exceeds_limit_full_clamp
text = text.replace(
    'headrooms = {"monthly_cap::monthly::": Decimal("1450")}',
    'headrooms = {"monthly_cap::monthly::": Decimal("50")}'
)

# 2. Fix cap_type in test_example_1_monthly_cashback_partial
text = text.replace(
    'cap = _cap_rule(limit=1500, scope=CapScope.MONTHLY)',
    'cap = _cap_rule(cap_type="monthly_cap", limit=1500, scope=CapScope.MONTHLY)'
)

with open("tests/unit/test_caps.py", "w") as f:
    f.write(text)
