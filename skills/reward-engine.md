# Reward Engine Patterns

## Purpose

The Reward Engine is the **single deterministic source of truth** for all financial reward calculations. It is a pure computation module — no I/O, no side effects, no randomness.

---

## Rules

### Core Philosophy
- **Pure functions** only — no side effects
- **No DB access** — takes data, returns results
- **No AI calls** — deterministic computation only
- **No randomness** — same inputs always produce same outputs
- **No I/O** — no files, network, or external calls
- Located in `backend/reward_engine/`

### Boundary Enforcement
- Called **only** by the Service layer
- Never called from: API routes, AI agents, Repository layer
- Imports only from: `core/constants`, `schemas/` (read-only), nothing else

---

## Module Structure

| Module | Responsibility |
|---|---|
| `calculator.py` | Main entry point — orchestrates full reward evaluation |
| `cashback.py` | Cashback computation: `(rate/100) * amount` |
| `points.py` | Points computation: `floor((amount/spend_unit) * points)` |
| `multipliers.py` | Multiplier application: `base_rate * multiplier` |
| `exclusions.py` | Exclusion evaluation: MCC, merchant name checks |
| `caps.py` | Cap enforcement: per-txn, monthly, category, annual |
| `merchant_matcher.py` | Merchant-to-tier matching by priority |
| `ranker.py` | Card ranking by effective rupee value |
| `normalizer.py` | Normalize all rewards to rupee value |

---

## Computation Flow

```
1. Merchant Matcher → which tier/reward rate applies
2. Base Rate + Multiplier → effective rate
3. Cashback or Points → raw reward amount
4. Cap Check → capped reward
5. Exclusion Check → zero if excluded
6. Normalize to INR → effective_reward_inr
7. Ranker → sorted list for recommendation
```

---

## Inputs & Outputs

### Inputs
- `card_benefits` — structured rules (rates, caps, exclusions, multipliers)
- `transaction_amount` — Decimal (INR)
- `merchant_name` — str
- `mcc_code` — str
- `transaction_category` — str
- `is_online` — bool
- `cumulative_spend` — Decimal (for cap evaluation)

### Outputs
- `effective_reward_inr` — Decimal
- `reward_type` — `cashback` or `points`
- `points_earned` — int/None
- `cashback_earned` — Decimal/None
- `applied_rate` — Decimal
- `applied_cap` — Decimal/None
- `is_excluded` — bool
- `exclusion_reason` — str/None
- `milestone_triggered` — bool
- `breakdown` — list (step-by-step trace)

---

## Merchant Matching Priority

1. **Exact merchant name match** (case-insensitive)
2. **MCC code match** against category MCC list
3. **Transaction category match** (inferred)
4. **Default / base rate** (fallback)

First match wins.

---

## Cap System

| Type | Scope |
|---|---|
| Per-transaction cap | Max reward for single transaction |
| Monthly cap | Max reward per calendar month |
| Category cap | Max reward for specific category per period |
| Annual cap | Max lifetime reward per card year |

Formula: `effective = max(0, cap_limit - cumulative_reward)`

---

## Ranking Logic

1. Run full reward calculation for each active card
2. Filter out `is_excluded = True`
3. Sort by `effective_reward_inr` descending
4. Tie-break: lower annual fee → alphabetical name

---

## Normalization

| Reward Type | Formula |
|---|---|
| Cashback | `effective_inr = cashback_amount` |
| Points | `effective_inr = points * rupee_value_per_point` |
| Air miles | `effective_inr = miles * cost_per_mile` |
| Vouchers | Face value only if declared in card config |

---

## Preferred Patterns

```python
# Pure function with explicit I/O
def calculate_effective_reward(
    card_config: CardConfig,
    transaction: TransactionContext
) -> RewardOutput:
    """Pure computation — no side effects."""
    if is_excluded(card_config, transaction):
        return RewardOutput.zero(exclusion_reason="...")
    
    rate = match_merchant(card_config, transaction)
    effective_rate = apply_multiplier(rate, card_config, transaction)
    raw_reward = compute_cashback(effective_rate, transaction.amount)
    capped_reward = apply_caps(raw_reward, card_config, transaction.cumulative_spend)
    
    return RewardOutput(
        effective_reward_inr=capped_reward,
        breakdown=[rate, effective_rate, raw_reward, capped_reward]
    )
```

---

## Anti-Patterns

- Database calls inside engine modules
- AI/LLM calls to compute rewards
- `random` or non-deterministic operations
- Floating-point math — use `Decimal`
- Importing services, repositories, or agents
- Calling engine directly from API routes or agents
- Hardcoded card-specific logic (use card_config JSONB)

---

## Best Practices from Codebase

- Each module in `reward_engine/` is a self-contained pure computation unit
- Modules declare architectural boundaries in docstrings
- Calculator orchestrates, sub-modules compute individual steps
- All monetary values use `Decimal`, never `float`
- Engine outputs include full breakdown for auditability