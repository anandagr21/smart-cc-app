# Business Logic Security Review

## Summary
The business logic review examined the core transactional and reward workflows of the application as a financial system. Several critical logic flaws were found that allow malicious actors to trivially manipulate their apparent spend volumes, farm rewards, and bypass fee waiver thresholds.

## Identified Findings

### 1. Duplicate Transaction Abuse & Cashback Farming (High)
- **Vulnerability**: The transaction creation endpoint (`POST /api/v1/transactions`) lacks idempotency and uniqueness constraints.
- **Attack Scenario**: A user can submit the exact same transaction request (same merchant, amount, and date) hundreds of times in a loop.
- **Affected Data**: `SpendAggregator` calculations, fee waiver progress, milestone progress, and behavioral analytics.
- **Fix Recommendation**: Implement an idempotency key header or enforce a unique compound constraint on `(user_id, merchant_name, amount, transaction_date)`. 

### 2. Post-Transaction Amount Alteration (Medium)
- **Vulnerability**: The `PATCH /api/v1/transactions/{id}` endpoint allows users to arbitrarily update the `amount` of a past transaction without leaving an immutable audit trail.
- **Attack Scenario**: After rewards or milestones are computed (or at the end of the year to artificially hit a fee waiver threshold), a user can update an old transaction from ₹10 to ₹100,000.
- **Affected Data**: `SpendAggregator` recalculates the total spend based on the new altered amount, artificially inflating the user's metrics.
- **Fix Recommendation**: Financial ledgers should be immutable. Restrict `PATCH` on `amount`. If an amount is incorrect, the user should issue a reversal (refund) transaction and create a new correct transaction.

### 3. Missing Transaction Upper Bounds (Low)
- **Vulnerability**: `TransactionCreate` schema enforces `amount > 0` but has no upper boundary constraint (e.g., `< 1,000,000,000`).
- **Attack Scenario**: An attacker submits a massive spend value that overflows display logic, breaks graphing libraries in the React Native frontend, or skews aggregate portfolio statistics.
- **Fix Recommendation**: Add a reasonable upper limit (e.g., `le=10000000` for 10M INR) to the `amount` field in Pydantic.
