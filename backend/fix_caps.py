import re

with open("tests/unit/test_caps.py", "r") as f:
    text = f.read()

# Fix cap_type in test_example_1_monthly_cashback_partial
text = text.replace(
    'cap = _cap_rule(limit=1500, scope=CapScope.MONTHLY)',
    'cap = _cap_rule(cap_type="monthly_cap", limit=1500, scope=CapScope.MONTHLY)'
)

# TestScenarioExamples.test_example_1_monthly_cashback_partial
text = text.replace(
    'headrooms = {"monthly_cap::monthly::": Decimal("50")}',
    'headrooms = {"monthly_cap::monthly::": Decimal("1450")}'
)

# TestScenarioExamples.test_example_2_category_cap_exhausted
# "Fuel category cap exhausted -> fuel reward becomes 0"
# cap limit 500, earned 500
text = text.replace(
    'headrooms = {"category_cap::monthly::fuel": Decimal("0")}',
    'headrooms = {"category_cap::monthly::fuel": Decimal("500")}'
)

# TestScenarioExamples.test_combined_monthly_and_category_caps
# Monthly limit 1500, category limit 200.
# "Category cap (priority 5) applies first: 100->100" (so headroom > 100, earned < 100)
# "Monthly cap (priority 10): headroom 1500, reward 100 -> 100"
text = text.replace(
    '"category_cap::monthly::fuel": Decimal("100"),\n            "monthly_cap::monthly::": Decimal("1500"),',
    '"category_cap::monthly::fuel": Decimal("0"),\n            "monthly_cap::monthly::": Decimal("0"),'
)

# TestScenarioExamples.test_annual_and_monthly_stacking
# monthly limit 500, annual limit 2000.
# "Monthly: headroom 400" -> earned 100
# "Annual: headroom 300" -> earned 1700
text = text.replace(
    '"monthly_cap::monthly::": Decimal("400"),\n            "annual_cap::annual::": Decimal("300"),',
    '"monthly_cap::monthly::": Decimal("100"),\n            "annual_cap::annual::": Decimal("1700"),'
)

# TestScenarioExamples.test_all_caps_exhausted_zero_reward
# Monthly limit 1000. headroom 0 -> earned 1000
text = text.replace(
    'headrooms = {"monthly_cap::monthly::": Decimal("0")}\n        # Transaction cap (always fresh): 1000 → 500\n        # Monthly cap: headroom 0, reward 500 → 0',
    'headrooms = {"monthly_cap::monthly::": Decimal("1000")}\n        # Transaction cap (always fresh): 1000 → 500\n        # Monthly cap: headroom 0, reward 500 → 0'
)

# TestScenarioExamples.test_partial_reduction_across_multiple_caps
# Monthly limit 1000, annual limit 300.
# "Monthly: headroom 600" -> earned 400
# "Annual: headroom 300" -> earned 0
text = text.replace(
    '"monthly_cap::monthly::": Decimal("600"),\n            "annual_cap::annual::": Decimal("300"),',
    '"monthly_cap::monthly::": Decimal("400"),\n            "annual_cap::annual::": Decimal("0"),'
)

# TestScenarioExamples.test_warnings_accumulate
# "Monthly: headroom 100" -> earned 900
# "Annual: headroom 50" -> earned 950
text = text.replace(
    'headrooms2 = {\n            "monthly_cap::monthly::": Decimal("100"),\n            "annual_cap::annual::": Decimal("50"),\n        }',
    'headrooms2 = {\n            "monthly_cap::monthly::": Decimal("900"),\n            "annual_cap::annual::": Decimal("950"),\n        }'
)
# "Monthly: headroom 60" -> earned 940
# "Annual: headroom 100" -> earned 900
text = text.replace(
    'headrooms3 = {\n            "monthly_cap::monthly::": Decimal("60"),\n            "annual_cap::annual::": Decimal("100"),\n        }',
    'headrooms3 = {\n            "monthly_cap::monthly::": Decimal("940"),\n            "annual_cap::annual::": Decimal("900"),\n        }'
)

# TestEvaluateCapsPipeline.test_multiple_caps_applied
# transaction limit 300. monthly limit 500.
# "monthly cap: headroom 300" -> earned 200
text = text.replace(
    'headrooms = {"monthly_cap::monthly::": Decimal("300")}',
    'headrooms = {"monthly_cap::monthly::": Decimal("200")}'
)

# TestEvaluateCapsPipeline.test_reward_fully_exhausted
# monthly limit 1000.
text = text.replace(
    'headrooms = {"monthly_cap::monthly::": Decimal("0")}\n        result = evaluate_caps(Decimal("500"), [cap], headrooms=headrooms)',
    'headrooms = {"monthly_cap::monthly::": Decimal("1000")}\n        result = evaluate_caps(Decimal("500"), [cap], headrooms=headrooms)'
)

# TestEvaluateCapsPipeline.test_reward_zero_after_prior_caps
# monthly limit 100.
text = text.replace(
    'headrooms = {\n            "monthly_cap::monthly::": Decimal("0"),\n        }',
    'headrooms = {\n            "monthly_cap::monthly::": Decimal("100"),\n        }'
)

# TestEvaluateCapsPipeline.test_headroom_exhausted_during_evaluation
# monthly limit 500. "headroom 400" -> earned 100
text = text.replace(
    'headrooms = {"monthly_cap::monthly::": Decimal("400")}',
    'headrooms = {"monthly_cap::monthly::": Decimal("100")}'
)

# TestEvaluateCapsPipeline.test_warning_near_exhaustion
# limit 500. "headroom 450" -> earned 50
text = text.replace(
    'headrooms = {"monthly_cap::monthly::": Decimal("450")}',
    'headrooms = {"monthly_cap::monthly::": Decimal("50")}'
)

# TestEvaluateCapsPipeline.test_no_warning_when_exhausted
# limit 500. "headroom 100" -> earned 400
text = text.replace(
    'headrooms = {"monthly_cap::monthly::": Decimal("100")}',
    'headrooms = {"monthly_cap::monthly::": Decimal("400")}'
)

with open("tests/unit/test_caps.py", "w") as f:
    f.write(text)

