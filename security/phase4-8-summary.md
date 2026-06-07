# Phase 4-8 Manual Security Review Summary

## Overview
A comprehensive manual security review was conducted covering Authentication, Authorization, Business Logic, Recommendation Engine, and API Security. While the deterministic reward engine is fundamentally sound, the lack of API-level access controls and input constraints exposes the platform to several critical vulnerabilities.

### Critical Findings
1. **Unprotected Card Intelligence Endpoints**: `POST /api/v1/card-intelligence/*` endpoints lack any authentication or RBAC guards, exposing the system to Server-Side Request Forgery (SSRF) and Denial of Wallet via unauthenticated LLM API consumption.
2. **Server-Side Request Forgery (SSRF)**: `monitor_service.fetch_and_clean_card_page` blindly accepts and fetches any URL provided, allowing attackers to scan internal infrastructure or AWS metadata.
3. **Unprotected Card Catalog Admin Endpoints**: Global card rules can be modified or deleted by unauthenticated attackers.
4. **Transaction IDOR**: The `/api/v1/transactions/card/{card_id}` endpoint does not verify if the requested `card_id` belongs to the authenticated user, allowing data exfiltration of financial histories.

### High Findings
1. **Unsafe Deserialization (JSON Bomb)**: The `/review/action` endpoint directly writes arbitrary nested dictionaries into `CardCatalog.reward_rules_json`, risking memory exhaustion and DoS.
2. **Duplicate Transaction Abuse (Farming)**: Lack of idempotency constraints enables attackers to loop identical transactions, artificially inflating behavioral analytics and spoofing fee waiver milestones.

### Medium Findings
1. **Missing Token Revocation**: Active access tokens cannot be blacklisted or revoked upon logout.
2. **Missing Rate Limiting / Brute-Force Protection**: Lack of global request limiting, leaving login and registration flows vulnerable to credential stuffing.
3. **Post-Transaction Amount Alteration**: Users can `PATCH` transaction amounts retroactively, corrupting the financial ledger without an immutable audit trail.
4. **Catalog Data Poisoning**: Unauthenticated users can inject fake cards into the catalog, severely manipulating the Recommendation Engine.

### Low Findings
1. **Missing Refresh Token Architecture**: Complete reliance on standard access tokens without a refresh rotation cycle.
2. **Information Leakage**: Potential for error traces bubbling up from the scraping logic to leak internal network structures if 500 errors are not cleanly masked.
3. **Missing Amount Upper Bounds**: No maximum boundary on transaction `amount` inputs.

---

### Confirmed IDOR Issues
- **`GET /api/v1/transactions/card/{card_id}`**: Leaks transaction details of other users' cards because the `TransactionService.fetch_card_transactions` does not enforce `user_id == current_user.id` checks.

### Authorization Gaps
- **Missing Administrative RBAC**: All catalog mutation routes and LLM intelligence extraction routes have entirely missing `Depends(get_current_user)` or `Depends(get_current_admin)` constraints. This is a severe vertical privilege escalation vector.

### Business Logic Risks
- **Mutable Financial Ledgers**: Transaction values and merchants can be edited directly rather than reversed/refunded, making the analytical history unreliable.
- **Data Poisoning in Recommendations**: The `RecommendationOrchestrator` trusts the global catalog. Because the catalog is unprotected, the orchestrator's output is compromised.

### Financial Abuse Risks
- **Milestone and Fee Waiver Manipulation**: Attackers can spoof endless high-value transactions to falsely trigger milestones or progress bars for annual fee waivers, degrading the integrity of the tracking service.
- **Denial of Wallet (LLMs)**: Attackers can exhaust OpenAI/Gemini quotas by repeatedly calling the unauthenticated `/ingest-raw` scraping pipeline.

---

### Recommended Fix Order

The following remediation roadmap is ranked by ease of exploitation, financial impact, data exposure, and likelihood of abuse:

1. **Fix Transaction IDOR**: (High Data Exposure Impact, Extremely Easy to Exploit). Add `user_id` validation to `/api/v1/transactions/card/{card_id}` immediately.
2. **Secure the Admin & Intelligence Endpoints**: (High Financial Impact, Extremely Easy to Exploit). Apply `Depends(get_current_user)` (and preferably a strict admin-role check) to all `/catalog` and `/card-intelligence` endpoints. This simultaneously fixes the Catalog Data Poisoning and the Denial of Wallet risks.
3. **Mitigate SSRF Vulnerability**: (High Internal Exposure, Moderate to Exploit). Implement strict URL allowlisting (e.g., only `sbicard.com`, `hdfcbank.com`) in `fetch_and_clean_card_page` and explicitly reject internal IPv4 ranges.
4. **Enforce Transaction Idempotency & Limits**: (Moderate Financial Impact, Easy to Exploit). Add a composite unique index on transactions to prevent spam, and enforce maximum realistic limits on the `amount` field.
5. **Implement Global Rate Limiting**: (Moderate Impact, Easy to Exploit). Add `slowapi` or API Gateway limits.
6. **Restrict Transaction Patching**: (Moderate Impact). Disable mutable `amounts` on historical transactions; enforce append-only corrections.
7. **Introduce Token Revocation/Rotation**: (Low Likelihood, High Effort). Transition to a short-lived access token plus refresh token architecture, or add a token invalidation table.
