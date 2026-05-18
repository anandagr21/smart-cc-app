"""
Module: backend.reward_engine.points
Responsibility: Deterministic calculation of reward points and conversion to INR.

Architectural Boundaries:
- Pure function.
- Converts spend to points based on earn rate, then points to INR based on redemption rate.

TODO:
- Implement compute_points(spend_unit, points_per_unit, amount)
- Implement convert_points_to_inr(points, redemption_rate)
"""
