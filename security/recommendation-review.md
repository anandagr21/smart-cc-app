# Recommendation Engine Security Review

## Summary
The Recommendation Engine (`RecommendationOrchestrator`) is purely deterministic and relies strictly on the current rules embedded in the active `CardCatalog`. However, data poisoning at the catalog level or creative input manipulation can skew the recommendations.

## Identified Findings

### 1. Catalog Data Poisoning (Critical)
- **Vulnerability**: Due to the missing authorization on the `POST /api/v1/cards/catalog` and `POST /api/v1/card-intelligence/review/action` endpoints, an attacker can define a fake credit card with absurd multipliers (e.g., `1000x` points).
- **Attack Scenario**: Because `RecommendationOrchestrator` dynamically pulls all rules from the catalog, injecting a poisoned card will instantly cause it to surface as the #1 ranked card in all recommendation queries for any user holding that card.
- **Fix Recommendation**: Implement strict RBAC (admin only) for the catalog APIs to prevent unauthorized global rule modifications.

### 2. Merchant Name Manipulation (Medium)
- **Vulnerability**: The `RecommendationRequest` relies on the client providing `merchant_name`.
- **Attack Scenario**: An attacker or malicious frontend client can send `merchant_name="Amazon Prime"` for all their purchases, regardless of the actual physical merchant, exploiting the `normalize_merchant` string-matching algorithm to fraudulently receive high-reward projections.
- **Fix Recommendation**: While difficult to stop entirely on manual entry, the engine should flag consecutive high-value transactions matching the same top-tier merchant, or require transaction statements for verified analytics rather than relying purely on user-provided strings.

### 3. Missing Negative Amount Validation (Low)
- **Vulnerability**: `RecommendationRequest` correctly enforces `amount > 0`, avoiding negative amount bugs. However, the orchestrator does not explicitly handle cases where refunds (which might be passed directly to the engine bypassing validation in an internal service call) result in negative `effective_reward_inr`.
- **Fix Recommendation**: Ensure that `TransactionContext` in the reward engine strictly traps negative amounts or explicitly uses absolute values if refunds are evaluated.
