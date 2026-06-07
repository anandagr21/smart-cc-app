# API Security Review

## Summary
The API relies heavily on FastAPI's dependency injection and Pydantic validation, providing excellent protection against generic SQL injection and type manipulation. However, there are significant gaps regarding Server-Side Request Forgery (SSRF), Denial of Service (DoS) protections, and data validation boundaries.

## Identified Findings

### 1. Server-Side Request Forgery (SSRF) (Critical)
- **Vulnerable Endpoint**: `POST /api/v1/card-intelligence/ingest-raw` -> `monitor_service.fetch_and_clean_card_page(url)`
- **Attack Scenario**: The route accepts an arbitrary `url` string and passes it directly to `requests.get(url_or_html)` in the backend. An attacker can supply internal network URLs (e.g., `http://169.254.169.254/latest/meta-data/` on AWS, or `http://localhost:5432/` for internal DB mapping) to exfiltrate cloud credentials or scan internal subnets.
- **Fix Recommendation**: Implement a strict URL allowlist (e.g., only `hdfcbank.com`, `sbicard.com`) or use an isolated proxy/sandbox network for outgoing scraping requests. Deny any internal IP addresses (10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, etc.).

### 2. Unsafe Deserialization / JSON Bomb (High)
- **Vulnerable Endpoint**: `POST /api/v1/card-intelligence/review/action`
- **Attack Scenario**: The `AdminReviewActionPayload` accepts `edited_json: dict` which is directly inserted into `CardCatalog.reward_rules_json` (a JSONB column). Because it's an unconstrained dictionary, an attacker can submit a heavily nested, massive JSON object (a "JSON Bomb"), leading to memory exhaustion and DoS when Postgres attempts to parse it into JSONB.
- **Fix Recommendation**: Replace `dict` with a strict recursive Pydantic schema that enforces max nesting depth, string lengths, and list sizes.

### 3. Missing Global Rate Limits (Medium)
- **Vulnerable Endpoints**: All Endpoints.
- **Attack Scenario**: There is no API rate limiting middleware installed. Attackers can flood the API, causing Denial of Service or accruing large AWS/OpenAI usage bills on endpoints that hit LLMs.
- **Fix Recommendation**: Implement `slowapi` or an Nginx rate limit to enforce reasonable request ceilings per IP or User ID.

### 4. Information Leakage via Error Traces (Low)
- **Vulnerable Endpoints**: Any route hitting external APIs (e.g., scraping).
- **Attack Scenario**: If `requests.RequestException` bubbles up via FastAPI's default 500 handler, it can leak the internal failure state or path structures.
- **Fix Recommendation**: Ensure a global exception handler is installed in `main.py` that strips sensitive traceback data from 500 responses in production (`ENVIRONMENT != "development"`).
