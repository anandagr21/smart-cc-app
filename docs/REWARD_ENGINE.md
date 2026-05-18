# Reward Engine Specification

## 1. Purpose

The Reward Engine is the **single deterministic source** of all financial reward calculations in the platform. It is a pure computation module — no I/O, no side effects, no randomness.

Given a card's benefit rules and a transaction context, it outputs the exact effective reward value in rupees and a full computation breakdown.

---

## 2. Inputs

| Input | Type | Description |
|---|---|---|
| `card_benefits` | Structured object | The card's reward rules (rates, caps, exclusions, multipliers) |
| `transaction_amount` | Decimal | Transaction value in INR |
| `merchant_name` | str | The merchant name (used for matching) |
| `mcc_code` | str | Merchant Category Code |
| `transaction_category` | str | Inferred category (e.g., "dining", "fuel", "travel") |
| `is_online` | bool | Whether the transaction is online |
| `cumulative_spend` | Decimal | User's YTD or monthly spend on this card (for milestone/cap evaluation) |

---

## 3. Outputs

| Output | Type | Description |
|---|---|---|
| `effective_reward_inr` | Decimal | Final reward value in rupees |
| `reward_type` | enum | `cashback` or `points` |
| `points_earned` | int / None | Points awarded (if applicable) |
| `cashback_earned` | Decimal / None | Cashback in rupees (if applicable) |
| `applied_rate` | Decimal | The rate used in computation |
| `applied_cap` | Decimal / None | Cap that was applied, if any |
| `is_excluded` | bool | Whether this transaction was excluded |
| `exclusion_reason` | str / None | Human-readable exclusion reason |
| `milestone_triggered` | bool | Whether a milestone was hit |
| `breakdown` | list | Step-by-step computation trace |

---

## 4. Cashback System

- Cashback rate is expressed as a **percentage** (e.g., `5.0` = 5%)
- Formula: `cashback = (rate / 100) * transaction_amount`
- Multiple tiers can exist (e.g., 5% on dining, 1% on others)
- Category matching determines which rate applies
- Base rate applies when no category match is found

---

## 5. Points System

- Points rate is expressed as **points per ₹N spent** (e.g., `5 points per ₹100`)
- Formula: `points = floor((transaction_amount / spend_unit) * points_per_unit)`
- Points are converted to rupee value using a card-specific **redemption rate** (e.g., `1 point = ₹0.25`)
- Formula: `effective_reward_inr = points * redemption_rate_per_point`

---

## 6. Multiplier System

- Multipliers boost the base rate for specific merchants or categories
- A multiplier is a factor applied on top of the base rate
- Formula: `effective_rate = base_rate * multiplier`
- Multipliers are evaluated after category matching, before cap application
- Only the highest applicable multiplier is applied (no stacking unless explicitly defined in card config)

---

## 7. Exclusions

Transactions matching any exclusion rule yield **zero reward**.

Common exclusion categories:
- Fuel surcharge transactions
- Rent payments (via third-party apps)
- Utility bill payments (on some cards)
- EMI transactions
- Wallet top-ups
- Government payments

Exclusion matching logic:
1. Check MCC code against the card's excluded MCC list
2. Check merchant name against the card's excluded merchant list
3. If either matches → `is_excluded = True`, reward = ₹0

---

## 8. Caps

Caps limit the maximum reward earned within a period.

| Cap Type | Description |
|---|---|
| Per-transaction cap | Max reward for a single transaction |
| Monthly cap | Max reward accumulation per calendar month |
| Category cap | Max reward for a specific category per period |
| Annual cap | Max lifetime reward per card year |

Cap evaluation:
1. Compute uncapped reward
2. Compare `cumulative_reward + uncapped_reward` against applicable caps
3. If over cap: `effective_reward = max(0, cap_limit - cumulative_reward)`
4. Return the capped value and flag `applied_cap`

---

## 9. Merchant Matching

Merchant matching determines which reward tier applies to a transaction.

Matching priority (highest to lowest):
1. **Exact merchant name match** (case-insensitive)
2. **MCC code match** against category MCC list
3. **Transaction category match** (inferred)
4. **Default / base rate** (fallback)

The engine uses the first matching rule in this priority order.

---

## 10. Ranking Logic

When recommending which card to use for a transaction, the engine:

1. Runs the full reward calculation for each of the user's active cards
2. Filters out cards where `is_excluded = True`
3. Sorts by `effective_reward_inr` descending
4. Returns the ranked list with full breakdown per card

Tie-breaking: if two cards have identical `effective_reward_inr`, rank by:
1. Lower annual fee
2. Alphabetical card name (deterministic)

---

## 11. Effective Value Calculation

All reward types are normalized to a single **effective rupee value** to enable cross-card comparison.

```
cashback card:  effective_reward_inr = cashback_amount
points card:    effective_reward_inr = points_earned * rupee_value_per_point
```

The `rupee_value_per_point` is a fixed property of the card definition. It is **never estimated or inferred** by the AI layer.

---

## 12. Normalization to Rupee Value

The goal is to answer: *"For ₹1000 spent here, how many rupees do I effectively get back?"*

- Cashback → already in rupees
- Reward points → multiplied by the card's stated redemption rate
- Air miles → converted using a fixed `cost_per_mile` declared in card config
- Vouchers → valued at face value only if the card config explicitly declares it

If a card's points have **no declared redemption rate**, the effective value defaults to ₹0 and a flag `redemption_rate_missing = True` is returned. The AI layer may then surface a warning to the user.
