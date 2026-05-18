# Domain Terminology

All code, documentation, and AI prompts must use these terms consistently.

---

## Merchant
A business where a credit card transaction occurs. Identified by merchant name and/or MCC code. Examples: Swiggy, Amazon, HPCL.

## MCC (Merchant Category Code)
A 4-digit numeric code classifying merchants by payment networks. Example: `5812` = Restaurants, `5541` = Fuel Stations. Used by the reward engine to map transactions to reward categories.

## Cashback
A direct monetary benefit returned as a percentage of the transaction amount, in INR. Formula: `cashback = (rate / 100) * transaction_amount`. Subject to caps and exclusions.

## Reward Points
A loyalty currency unit awarded for spending. Earned as `N points per ₹X spent`. Converted to rupee value using the card's declared redemption rate. `effective_reward_inr = points_earned * redemption_rate_per_point`. Rate never estimated by AI.

## Milestone
A spend target that triggers a bonus reward when reached. Example: "Spend ₹1,00,000/year → ₹2,000 cashback bonus." Tracked via cumulative spend per card. Cards may have multiple milestone tiers.

## Fee Waiver
Annual fee waived when minimum spend threshold is reached. Example: "Fee of ₹500 waived on ₹50,000 annual spend." Stored in card config. Does not affect reward computation — surfaced as informational.

## Effective Reward
The normalized INR value of any reward type for a transaction. The only unit used for cross-card comparison and ranking. Computed exclusively by the Reward Engine. Always in INR, rounded to 2 decimal places.

## Online Transaction
A transaction completed digitally (not at physical POS). Flagged via `is_online: true`. Some cards offer higher rates or apply different exclusions for online transactions.

## Exclusions
Transaction types or merchants for which no reward is earned. Defined per card as excluded MCCs, merchant names, or categories. Common exclusions: fuel surcharge, rent via third-party apps, EMI, wallet top-ups, utility bills, government payments. When applied: `is_excluded = true`, `effective_reward_inr = 0`.

## Reward Cap
A maximum limit on reward earned within a period. Types:
- **Per-transaction cap** – max reward per transaction
- **Monthly cap** – max reward per calendar month
- **Category cap** – max reward per category per period
- **Annual cap** – max reward for full card year

When applied, engine returns `applied_cap` and caps `effective_reward_inr` accordingly.
