# Smart CC App — Technical Due Diligence Audit (DEEPSEEK)

**Date:** June 16, 2026  
**Auditor:** Principal Engineer / Security Auditor / Systems Architect  
**Repository:** `/Users/anandagrawal/work/smart-cc-app`  
**Scope:** Complete repository audit — 705 files, ~399K words, 39 database tables, 24 API endpoints  
**Methodology:** 8 parallel subagent deep-dives covering every file in the repository

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Flow Analysis](#3-data-flow-analysis)
4. [Code Quality Review](#4-code-quality-review)
5. [Security Audit](#5-security-audit)
6. [Scalability Review](#6-scalability-review)
7. [Production Readiness Assessment](#7-production-readiness-assessment)
8. [Feature Completion Matrix](#8-feature-completion-matrix)
9. [Remaining Work Roadmap](#9-remaining-work-roadmap)
10. [Key Findings Index](#10-key-findings-index)

---

## 1. Executive Summary

### 1.1 What does this system actually do?

Smart CC is an **AI-powered credit card optimization platform**. It tells users which credit card to use for any given purchase to maximize rewards (cashback, points, miles). The core engine is a **deterministic, pure-function financial calculator** that computes exact rupee-value rewards accounting for caps, exclusions, multipliers, and milestones. An **AI narration layer** (separate from the engine) generates human-readable explanations. The system also includes a **card catalog ingestion pipeline** that scrapes bank websites and PDFs, uses LLMs to extract structured reward data, and routes results through admin review before publishing to production.

### 1.2 What is the strongest part of the architecture?

**The deterministic reward engine / AI narration boundary.** The strict separation between financial computation (pure functions, no I/O, no randomness, fully unit-testable) and AI explanation (LLM narrates engine output, never computes values) is the correct architecture for a fintech product. This is well-documented, well-reasoned, and would satisfy regulatory scrutiny. The engine's formula system (Cashback → Percentage/Flat, Points → floor(amount/spend_unit) × points_per_unit × multiplier, Caps → priority-ordered headroom tracking) is sound.

### 1.3 What is the weakest part?

**Authorization and access control.** 46% of API endpoints (11 of 24) have no authentication. Entire admin surfaces (card catalog mutations, card intelligence ingestion, merchant CRUD) are open to unauthenticated access. A transaction IDOR allows any authenticated user to read any other user's financial history. The admin role check is purely client-side in the frontend. This is the single biggest launch blocker.

### 1.4 What would break first under scale?

**The LLM extraction pipeline.** Three separate LLM client instantiation patterns create inconsistent error handling, retry logic, and cost tracking. The `fetch_and_clean_card_page` function makes synchronous `requests.get()` calls in an async context. The merchant fuzzy index loads all merchants and aliases into memory on every cache miss. There is no queue, no backpressure, and no circuit breaker on LLM calls.

### 1.5 What are the biggest security risks?

1. **CRITICAL — Unprotected admin/intelligence API endpoints** (no auth, no RBAC)
2. **CRITICAL — SSRF** via unvalidated URL fetching in card scraping pipeline
3. **CRITICAL — Transaction IDOR** (cross-user financial data exfiltration)
4. **HIGH — JSON bomb** via unconstrained `dict` type in review/action endpoint
5. **HIGH — Duplicate transaction farming** (no idempotency constraints)
6. **HIGH — `evaluate_rule_cap_allowance()` is a mock** that always returns the full multiplier

### 1.6 What should the next 30 days of engineering focus on?

**Week 1:** Fix all authorization gaps (add `Depends(get_current_user)` + `Depends(get_current_admin)` to unprotected endpoints, fix transaction IDOR, implement SSRF URL allowlisting).

**Week 2:** Wire rate limiting (slowapi is already a dependency), add idempotency constraints on transactions, make financial ledger append-only.

**Week 3:** Remove the mock `evaluate_rule_cap_allowance()`, unify the two parallel reward engine implementations, add startup guard for JWT secret.

**Week 4:** Set up CI/CD pipeline (GitHub Actions: ruff, mypy, pytest, Playwright), implement token revocation/refresh token architecture.

### 1.7 What features should be postponed?

- The entire LangGraph agent layer (all 5 agent files are stubs with zero implementation)
- "Financial Intelligence (Coming Soon)" feature in the frontend
- Portfolio evolution AI narrative synthesis (works but is low-impact relative to security fixes)
- Multi-tenant/admin role hierarchy beyond basic ADMIN check

### 1.8 Is the AI catalog architecture fundamentally sound?

**Yes, with caveats.** The human-in-the-loop admin review flow (scrape → extract → admin verify → approve → publish) is correct. The extraction pipeline's use of bank-specific keyword maps and dynamic prompt templates from the database is well-designed. However, three separate LLM client patterns, prompt injection risk from untrusted PDF content, and no confidence scoring for extracted values need addressing before production use.

### 1.9 Is the recommendation engine production ready?

**Partially.** The deterministic core (cashback, points, caps, ranking) is well-specified and correctly uses Decimal arithmetic. However, `cumulative_spend` is always `0` in all evaluations (meaning spend-based caps are never enforced), `evaluate_rule_cap_allowance()` is a mock, and two parallel implementations exist (it's unclear which powers production flows). These must be resolved before it can be trusted.

### 1.10 Is this repository ready for a real public launch?

**No.** Four critical security vulnerabilities, no CI/CD pipeline, no production deployment configuration, zero frontend unit tests, mock functions in the reward calculation path, and an incomplete authorization model make this unsuitable for public launch. With 4 weeks of focused work on the items in §1.6, it could reach a viable private beta state. Production launch would require additional hardening (see §9).

---

## 2. Architecture Overview

### 2.1 System Diagram (As-Built)

```
┌─────────────────────────────────────────────────────────────────┐
│                   React Native (Expo) Frontend                   │
│  Expo Router → Feature-First Architecture → Zustand + TanStack  │
│                    Query → Axios API Client                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS (REST) / Bearer JWT
┌──────────────────────────────▼──────────────────────────────────┐
│                      FastAPI Backend                             │
│                                                                  │
│  ┌──────────────────┐  ┌─────────────────────────────────────┐ │
│  │   API Routes     │  │         Admin / Ingestion           │ │
│  │   (24 endpoints) │  │  Scrape → Chunk → LLM Extract →     │ │
│  │   Thin HTTP      │  │  Admin Review → Approve → Publish   │ │
│  └────────┬─────────┘  └─────────────────────────────────────┘ │
│           │                                                      │
│  ┌────────▼──────────────────────────────────────────────────┐  │
│  │                    Service Layer                           │  │
│  │  TransactionService  RecommendationOrchestrator            │  │
│  │  MerchantService     FeeWaiverService   SearchService      │  │
│  │  CardService         RewardRuleService  StatementService*  │  │
│  └────────┬──────────────────────────────────────────────────┘  │
│           │                                                      │
│  ┌────────▼─────────┐  ┌────────────────────────────────────┐   │
│  │  Reward Engine   │  │        AI/ML Layer                  │   │
│  │  (Pure/Determin-  │  │  ai/client.py (narrative synthesis) │   │
│  │   istic)          │  │  ai_extraction.py (field extraction)│   │
│  │  evaluator.py     │  │  structured_parser.py (card parsing)│   │
│  │  cashback.py      │  │  agents/* (5 files, ALL STUBS)      │   │
│  │  points.py        │  │  behavioral_memory/ (heuristics)     │   │
│  │  caps.py          │  │  adaptive_intelligence/ (metrics)    │   │
│  │  ranking.py       │  └────────────────────────────────────┘   │
│  └───────────────────┘                                           │
│           │                                                      │
│  ┌────────▼──────────────────────────────────────────────────┐  │
│  │              Repository Layer (DB Access)                  │  │
│  │  UserRepo  CardRepo  TransactionRepo  MerchantRepo         │  │
│  └────────────┬─────────────────────────────────────────────┘  │
└───────────────┼─────────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────┐
│                   PostgreSQL 16 (JSONB)                          │
│  39 tables across 8 domains: users, cards, transactions,         │
│  merchants, rewards, ingestion, search, intelligence             │
└─────────────────────────────────────────────────────────────────┘
```

*Starred items are stubs with zero implementation.

### 2.2 Layer Responsibilities

| Layer | Responsibility | Adherence |
|-------|---------------|-----------|
| **API Routes** | HTTP interface, input parsing, auth checks. No business logic. | **Mixed** — Routes are thin but auth checks are missing on 46% of endpoints |
| **Services** | Orchestrate use cases. Call repositories + reward engine. | **Good** — Consistent pattern, clear boundaries |
| **Reward Engine** | Pure financial computation. No I/O, no side effects. | **Mixed** — Core is pure, but has 5 stub files and 2 parallel implementations |
| **Repositories** | All DB access. Return domain models. | **Good** — Clean pattern, async-first |
| **AI Layer** | Intent parsing, explanation generation, extraction. Never computes rewards. | **Good architecture, incomplete implementation** — 5 agent stubs, 3 separate LLM clients |
| **Frontend** | UI state, rendering, navigation. Thin client. | **Good** — Feature-first architecture, clean state management |

### 2.3 Authentication & Authorization Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Auth Flow                             │
│                                                          │
│  POST /auth/register ──→ bcrypt hash ──→ JWT (30-day)   │
│  POST /auth/login    ──→ bcrypt verify ──→ JWT          │
│  Google OAuth        ──→ google.oauth2 ──→ JWT          │
│                                                          │
│  Token stored: expo-secure-store (native) / localStorage (web) │
│  Token verified: HS256, exp check, alg:none prevented    │
│                                                          │
│  GAPS:                                                   │
│  ❌ No token revocation (no blacklist, no version)       │
│  ❌ No refresh token rotation                            │
│  ❌ 30-day access token expiry (too long)                │
│  ❌ 46% of endpoints have NO auth check                  │
│  ❌ Admin check is client-side only                      │
│  ❌ Auto-registration on failed login                    │
└─────────────────────────────────────────────────────────┘
```

### 2.4 Dependency Direction (Actual)

```
API Routes ──→ Services ──→ Reward Engine (pure)
              │             ├──→ Repositories ──→ Models (DB)
              │             └──→ AI Client (narrative only)
              │
              ├──→ merchant_intelligence/ (simple, legacy)
              └──→ merchants/ (rich, current)

⚠️ ISSUES:
- reward_engine.matcher imports card_intelligence.extraction.schemas (wrong direction)
- transactions.enrichment imports recommendations.utils (cross-slice coupling)
- auth.dependencies imports api.deps (domain layer depends on wiring layer)
```

---

## 3. Data Flow Analysis

### 3.1 Transaction Creation + Recommendation Flow

```
User enters: merchant="Swiggy", amount=₹500
         │
         ▼
POST /api/v1/transactions  (Auth: ✅)
         │
         ▼
TransactionService.create_transaction()
  ├── validate_transaction_dates()          [pure validator]
  ├── idempotency check (idempotency_key)   [prevents SOME duplicates]
  ├── merchant_service.normalize_merchant() [canonical name + category]
  ├── repository.create()                   [persist]
  ├── spend_aggregator.recalculate()        [update card spend totals]
  └── TransactionEnrichmentService.enrich()
        ├── get_user_cards()                [one DB call]
        ├── get_card_active_rules()         [one per unique card]
        ├── engine_evaluate()               [per card per txn, IN-MEMORY]
        │     ├── exclusions.check()        [early exit if excluded]
        │     ├── matcher.match_rules()     [merchant→category→default cascade]
        │     ├── cashback/points.compute() [strategy pattern]
        │     ├── caps.apply()              [⚠️ uses apply_caps_from_config — single cap only]
        │     └── normalizer.unify()        [all → INR]
        ├── rank_cards()                    [6-tuple deterministic sort]
        └── BehavioralMemoryEngine.record() [adapt confidence scores]
         │
         ▼
Response: EnrichedTransactionResponse with ranked card recommendations
```

### 3.2 Recommendation Evaluation Flow

```
POST /api/v1/recommendations/evaluate  (Auth: ✅, Rate Limit: 60/min)
  │
  ▼
RecommendationService.evaluate()
  ├── Generate calculation_id (UUID)
  ├── RecommendationOrchestrator.generate_recommendation()
  │     ├── resolution_engine.resolve()        [Cache→Alias→Fuzzy→LLM]
  │     ├── get_user_cards() + eligibility filter
  │     ├── For each card:
  │     │     ├── engine_evaluate()             [pure reward computation]
  │     │     └── PortfolioOptimizationEngine   [portfolio impact]
  │     ├── FeeWaiverService.evaluate()         [waiver state per card]
  │     └── TransactionOptimizer.optimize()     [rank by intent]
  ├── Save RecommendationAudit (forensic trail)
  └── Log PII-free summary
  │
  ▼
Response: SingleResponse[RecommendationResponse] with ranked cards + explanations
```

### 3.3 Merchant Resolution Flow

```
POST /api/v1/merchants/resolve  (Auth: ❌ NONE)
  │
  ▼
resolution_engine.resolve("swiggy food delivery")
  ├── Stage 0: normalize_with_tokens()          [pure text normalization]
  ├── Stage 0.5: resolution_cache.get()         [LRU cache hit → early exit]
  ├── Stage 1: _alias_match()                   [DB lookup by normalized alias]
  ├── Stage 2: fuzzy_index.fuzzy_search()       [RapidFuzz token_set_ratio]
  │     └── classify_score() → FUZZY_AUTO / LLM_RECOVERY / LLM_DISCOVERY / UNKNOWN
  ├── Stage 3: llm_resolver.recover()           [LLM picks from candidates]
  ├── Stage 4: llm_resolver.discover()          [LLM identifies new merchant]
  └── MetricsRepository.record()                [telemetry]
  │
  ▼
Response: ResolutionResponse { canonical_name, category, confidence, resolution_type }
```

### 3.4 Card Ingestion Pipeline

```
Admin uploads bank PDF/URL
         │
         ▼
POST /api/v1/card-intelligence/ingest-raw  (Auth: ❌ CRITICAL GAP)
  │
  ├── URL mode: monitor_service.fetch_and_clean_card_page(url)
  │     ├── ⚠️ SSRF: Validates against ALLOWED_BANK_DOMAINS + IP ranges
  │     └── BeautifulSoup: strip script/style/nav/footer → cleaned markdown
  │
  ├── PDF mode: pdf_parser.parse()
  │     └── PyMuPDF (fitz) → chunk page-by-page → SourceChunk rows
  │
  ├── Hash check: dedup existing documents
  ├── Find/create CardCatalog entry
  ├── Upsert CardMonitoring record
  ├── Create SourceDocument
  └── Background task: StructuredParser.extract_structured_card_data()
        └── LangChain ChatPromptTemplate → Gemini/DeepSeek → StructuredCardData
         │
         ▼
Admin Review: GET /review/{card_id} → source markdown + LLM JSON
Admin Approve/Reject: POST /review/action → writes to CardCatalog (if approved)
```

### 3.5 Fee Waiver Evaluation Flow

```
FeeWaiverEngine.evaluate(user_card)
  │
  ├── Guard: effective_annual_fee <= 0? → return None
  ├── Guard: waiver_target missing/zero? → return None
  │
  ├── Extract: annual_fee, waiver_target, current_spend, remaining_spend,
  │            days_remaining, progress, days_elapsed
  │            (⚠️ uses getattr chains with multiple fallback attribute names)
  │
  ├── Stage 1: WaiverProjections.project_completion_probability()
  │     └── Linear velocity model: daily_velocity = current_spend / days_elapsed
  │         Discrete probability buckets (0.05, 0.20, 0.40, 0.75, 0.85, 0.95, 1.0)
  │
  ├── Stage 2: WaiverScoring
  │     ├── compute_value_at_risk() = fee * (1 - probability)
  │     ├── determine_comfort_state() → SAFELY_ON_TRACK / MONITOR / REQUIRES_ATTENTION / UNLIKELY
  │     └── determine_urgency() → LOW / MODERATE / ELEVATED / HIGH
  │           (⚠️ magic number 50000 for remaining_spend)
  │
  └── Stage 3: WaiverExplainability.generate_state_explanation()
        └── Pre-written text lookup table (calm, editorial tone)
```

---

## 4. Code Quality Review

### 4.1 Architecture Problems

| Problem | Severity | Detail |
|---------|----------|--------|
| **Two parallel merchant systems** | HIGH | `merchant_intelligence/` (legacy, simple alias lookup) vs `merchants/` (current, fuzzy+LLM). Both exist, creating confusion. |
| **Two parallel reward engine implementations** | HIGH | `evaluate()` (rich, proper pipeline) vs `evaluate_transaction_for_portfolio()` (legacy, simplified, bypasses caps/exclusions). Unclear which powers production. |
| **Three separate LLM client patterns** | MEDIUM | `ai/client.py` (settings-based), `ai_extraction.py` (env var fallback), `structured_parser.py` (LangChain). Different API key resolution, different error handling. |
| **Reward engine imports from card_intelligence** | MEDIUM | `reward_engine.matcher` imports `card_intelligence.extraction.schemas` — violation of dependency direction. |
| **auth.dependencies imports from api.deps** | LOW | Domain auth layer depends on API wiring layer. Should be reversed. |

### 4.2 Dead Code

| File | Lines | Description |
|------|-------|-------------|
| `backend/core/auth.py` | 10 | Pure TODO stub — dead file, confuses maintainers |
| `backend/models/card.py` | 13 | Pure TODO — real model is `models/card_catalog.py` |
| `backend/models/transaction.py` | 11 | Pure TODO — real model is `transactions/models.py` |
| `backend/reward_engine/calculator.py` | 16 | Pure TODO — evaluator.py fills this role |
| `backend/reward_engine/merchant_matcher.py` | 12 | Pure TODO |
| `backend/reward_engine/multipliers.py` | 11 | Pure TODO |
| `backend/reward_engine/ranker.py` | 12 | Pure TODO — ranking.py sub-package fills this role |
| `backend/rules/card_config_schema.py` | 13 | Pure TODO |
| `frontend/types/api.ts` | ~5 | Stub with JSDoc only |
| `frontend/types/card.ts` | ~5 | Stub with JSDoc only |
| `frontend/types/transaction.ts` | ~5 | Stub with JSDoc only |
| `frontend/constants/config.ts` | ~5 | Stub with JSDoc only |
| `frontend/utils/formatting.ts` | ~5 | Stub with JSDoc only |
| `frontend/theme/motion.ts` | ~30 | Animation presets defined but never imported |
| `backend/merchants/schemas.py` | — | `MerchantSearchRequest` and `MerchantUpdate` defined but unused |
| `backend/search/schemas.py` | — | `SearchSessionResponse` defined but unused |

### 4.3 Mock/Stub Functions in Production Code

| Function | Location | Severity | Detail |
|----------|----------|----------|--------|
| `evaluate_rule_cap_allowance()` | `caps.py:329-348` | **CRITICAL** | Always returns original multiplier. Labeled "Mock implementation." If called in production, cap enforcement is silently broken. |
| `evaluate_transaction_for_portfolio()` | `evaluator.py:292-343` | **HIGH** | Uses legacy matcher + mock cap function. Hardcoded points formula inconsistent with real engine. |
| `generate_tradeoff_explanation()` | `fee_waiver/explainability.py:36-43` | MEDIUM | `milestone_acceleration` parameter unused. Returns empty string on false branch. Never called within module. |
| `search/service.py:46` | `search/service.py` | LOW | Comment "Cache and log (to be implemented)" — `SearchCache` table exists but never populated. |
| `search/suggestions.py:66-69` | `search/suggestions.py` | LOW | Card and offer suggestions declared as empty lists "Future: Search Cards/Offers" |

### 4.4 Duplicated Logic

1. **UserResponse construction** duplicated 5× in `auth/service.py` (register, login, google_login, accept_terms, get_current_user)
2. **Payment mode normalization** duplicated in 3 places (transactions/enrichment.py, recommendations/utils.py, merchants/normalizer.py)
3. **String normalization** duplicated in `utils.py` and `rewards/normalizers.py`
4. **Two separate cap evaluation systems** (`evaluate_caps()` rich multi-cap vs `apply_caps_from_config()` single-cap)
5. **Two separate transaction matchers** (`match_rules()` proper vs `match_transaction_to_rule()` legacy substring)
6. **Three secure storage patterns** in frontend stores (auth, theme, onboarding each implement different storage helpers)
7. **Two debounce implementations** (npm `use-debounce` vs local `useDebounce` hook)
8. **Two scraping implementations** (httpx.AsyncClient + UrlKnowledgeFetcher vs requests + fetch_and_clean_card_page)

### 4.5 Excessive Complexity

- `evaluator.py evaluate()` — 215 lines with deeply nested conditionals
- `card_intelligence/routes.py ingest_raw_bank_url()` — 100+ lines doing 5+ distinct operations
- `adaptive_intelligence/orchestrator.py augment_monthly_summary()` — 7+ engines called sequentially, no parallelism
- `ai/context_builder.py` — 7 classification functions with 10+ hardcoded thresholds
- `matcher.py match_transaction_to_rule()` — substring matching with `in` operator on category names

---

## 5. Security Audit

### 5.1 Critical Findings

| # | Finding | Endpoint(s) | Impact | Fix Effort |
|---|---------|-------------|--------|------------|
| C1 | **Unprotected Card Intelligence endpoints** | `POST /card-intelligence/*`, `GET /card-intelligence/review/*` | SSRF, DoS via LLM wallet drain, catalog data poisoning | 1 day |
| C2 | **Unprotected Card Catalog mutation endpoints** | `POST/PATCH/DELETE /cards/catalog` | Global catalog can be modified/deleted by unauthenticated attackers | 1 hour |
| C3 | **Server-Side Request Forgery (SSRF)** | `POST /card-intelligence/ingest-raw` | Internal network scanning, AWS metadata exfiltration | 2 hours |
| C4 | **Transaction IDOR** | `GET /transactions/card/{card_id}` | Cross-user financial data exfiltration | 1 hour |

### 5.2 High Findings

| # | Finding | Endpoint(s) | Impact | Fix Effort |
|---|---------|-------------|--------|------------|
| H1 | **JSON Bomb / Unsafe Deserialization** | `POST /card-intelligence/review/action` | Memory exhaustion DoS via unconstrained `dict` type | 2 hours |
| H2 | **Duplicate Transaction Farming** | `POST /transactions` | Inflated spend metrics, spoofed fee waiver milestones | 3 hours |
| H3 | **Mock cap enforcement in production** | Internal (`evaluate_rule_cap_allowance()`) | Cap limits silently unenforced | 4 hours |

### 5.3 Medium Findings

| # | Finding | Impact |
|---|---------|--------|
| M1 | **No token revocation** — stolen JWTs valid until natural expiry | Account takeover persistence |
| M2 | **No rate limiting** — slowapi dependency present but not wired | Brute force, credential stuffing, LLM wallet drain |
| M3 | **Mutable financial ledger** — `PATCH /transactions/{id}` allows retroactive amount changes | Financial data integrity |
| M4 | **46% of endpoints have no authentication** | Mass assignment, data poisoning |
| M5 | **Catalog data poisoning via recommendations** — orchestrator trusts unprotected catalog | Skewed recommendations for all users |
| M6 | **Prompt injection in extraction pipeline** — untrusted PDF/HTML text injected directly into LLM prompts | Extraction manipulation |

### 5.4 Low Findings

| # | Finding |
|---|---------|
| L1 | Missing refresh token architecture — 30-day access tokens only |
| L2 | Information leakage via uncaught scraping exceptions in 500 responses |
| L3 | Missing transaction amount upper bounds (only `gt=0` enforced) |
| L4 | Auto-registration on failed login (unusual pattern) |
| L5 | Web token storage in localStorage (XSS-vulnerable vs httpOnly cookies) |
| L6 | No CSRF protection |
| L7 | No certificate pinning |
| L8 | JWT secret defaults to "change-me-in-production-use-env-var" with no startup guard |
| L9 | `make_admin.py` bulk-upgrades ALL users to admin |
| L10 | Hardcoded database credentials in docker-compose.yml |

### 5.5 SAST/Dependency Scan Results

- **Semgrep**: 0 Critical, 0 High, 22 Medium (all in scraped HTML artifacts — not exploitable)
- **Trivy**: 0 Critical, 0 High, 4 Medium dependency vulns, 0 exposed secrets
- **Confirmed IDORs**: 1 (`GET /transactions/card/{card_id}`)
- **Confirmed missing RBAC**: All catalog mutation routes + all intelligence routes

---

## 6. Scalability Review

### 6.1 Database

| Concern | Assessment | Risk at 100K users |
|---------|-----------|-------------------|
| **Connection pooling** | Async SQLAlchemy with pool_size=10, max_overflow=20, pool_pre_ping=True | Adequate for ~500 concurrent requests |
| **Index coverage** | Good — composite indexes on frequent query patterns, GIN indexes on normalized tokens, functional indexes on JSONB | Will hold up to millions of rows |
| **N+1 queries** | `UserCard` uses `selectin` lazy loading — 10 cards = 11 queries | Medium risk at scale |
| **Full-table scans** | `_load_index()` loads ALL merchants + aliases into memory on cache miss | High risk as merchant catalog grows |
| **JSONB query patterns** | Card rules stored as JSONB, queried via field extraction | Good for read-heavy workloads |
| **No read replicas** | All queries hit single primary | Will bottleneck at ~1000 QPS |
| **Missing FKs** | `transactions.user_id` and `transactions.user_card_id` have no FK constraints | Data integrity risk, not performance |

### 6.2 Backend

| Concern | Assessment | Risk at 100K users |
|---------|-----------|-------------------|
| **Stateless services** | Services are stateless — horizontal scaling is trivially possible | Low |
| **Blocking I/O** | `requests.get()` (sync) in scraping pipeline, synchronous reward engine calls | Medium — wrap in executor |
| **Rate limiting** | Only 1/24 endpoints rate-limited | High — LLM endpoints will exhaust quotas |
| **No caching layer** | No Redis/Memcached. Merchant resolution cache is in-process LRU. | Medium |
| **No background job queue** | Ingestion parsing runs as `BackgroundTasks` — no retry, no persistence | High for production |

### 6.3 AI Pipeline

| Concern | Assessment | Risk at scale |
|---------|-----------|--------------|
| **LLM cost** | No cost tracking, no budget caps, no circuit breakers on extraction calls | **CRITICAL** — uncontrolled spend |
| **Extraction latency** | Synchronous LLM calls in request path for merchant resolution | Medium — 2-5s p95 |
| **No queuing** | Ingestion triggers immediate background task with no queue/retry | High |
| **Duplicate LLM calls** | No deduplication on extraction prompts | Medium |

### 6.4 Frontend

| Concern | Assessment |
|---------|-----------|
| **Bundle size** | NativeWind configured but unused (~50KB dead weight in bundle) |
| **Render performance** | StyleSheet.create used consistently — good for RN performance |
| **List virtualization** | FlatList/SectionList used for transactions — good for large datasets |
| **Re-render issues** | Zustand selectors used properly — no obvious re-render bombs |
| **Image optimization** | Static assets only, no dynamic image loading concerns |

### 6.5 Behavior at Scale Estimages

| Scale | Bottleneck | Mitigation |
|-------|-----------|------------|
| **1,000 users** | No issues expected | — |
| **10,000 users** | Merchant fuzzy index memory, LLM costs for merchant resolution | Add Redis cache, implement LLM call budget |
| **100,000 users** | Single PostgreSQL instance, no read replicas | Add read replicas, implement cursor-based pagination |
| **1,000,000 users** | Everything: DB, LLM costs, scraping pipeline, no queue system | Major rearchitecture needed (queue, sharding, CDN) |

---

## 7. Production Readiness Assessment

| Area | Score | Justification |
|------|-------|---------------|
| **Backend** | 6/10 | Clean architecture, good patterns. Held back by 46% unauthenticated endpoints, mock functions in production code paths, and missing rate limiting. |
| **Frontend** | 7/10 | Polished UI, good state management, strong design tokens. Held back by 5 stub files, zero tests, NativeWind dead weight, and incomplete search results. |
| **Database** | 7/10 | Well-normalized (39 tables), good index coverage, JSONB for flexibility. Held back by missing FK constraints on transactions, `Feedback` using float for money, and incomplete model registry. |
| **Security** | 3/10 | JWT implementation is correct, Pydantic validation is strong. Severely held back by 4 critical vulns, 3 high vulns, no token revocation, and client-only admin checks. |
| **AI Pipeline** | 5/10 | Good extraction → review → publish architecture. Good narrative safety properties (LLM never sees raw data). Held back by 3 separate LLM clients, prompt injection risk, no cost tracking, and 5 agent stubs. |
| **Admin System** | 6/10 | Well-designed review workflows, benchmark system, audit trails. Held back by mock data in several ingestion screens, unwired "New Card" button, read-only feedback, and hardcoded navigation. |
| **Observability** | 3/10 | Basic structlog logging with PII-free summaries in recommendation path. No metrics, no tracing, no alerting, no error tracking service, no health check endpoints beyond DB ping. |
| **Testing** | 3/10 | Backend: ~2 test files (conftest.py, test_ai_synthesis_e2e.py, test_merchant_resolution.py). Frontend: 0 unit tests. 8 Playwright E2E scripts exist but require manual execution. No CI pipeline. |
| **Deployment** | 3/10 | Docker Compose for dev. Multi-stage Dockerfile with privilege drop. No production configs, no CI/CD, no Kubernetes/Terraform, Adminer exposed on port 9001, hardcoded DB credentials. |
| **OVERALL** | **4.8/10** | Not production-ready. Strong architecture and documentation, but critical security gaps, zero testing infrastructure, and no deployment pipeline prevent launch. |

---

## 8. Feature Completion Matrix

### 8.1 Consumer Product

| Feature | Status | Detail |
|---------|--------|--------|
| **Authentication** | PARTIAL | Login/register/Google OAuth work. Missing: password reset, token refresh, token revocation. Auto-register on failed login is unusual. |
| **Wallet Management** | COMPLETE | Add/remove cards, view catalog, edit fees, track spend. Polished UI with skeletons, empty states, and search. |
| **Transaction Logging** | COMPLETE | Create/read/update/delete with enrichment and recommendations. |
| **Card Recommendations** | COMPLETE | Full deterministic engine + AI narration. ⚠️ `cumulative_spend` always 0, mock cap function. |
| **Fee Waiver Tracking** | COMPLETE | Deterministic projections, scoring, explainability. Pure functions, no I/O. |
| **Merchant Intelligence** | COMPLETE | Fuzzy matching, LLM resolution, alias learning, metrics. (Two systems exist — consolidate.) |
| **Monthly Intelligence** | COMPLETE | Hero narrative, behavioral highlights, forecasting, explainability sheet. |
| **Search** | PARTIAL | Intent detection + entity resolution work. Results page says "This is a placeholder." Card/offer suggestions are empty lists. |
| **Notifications** | COMPLETE | Type-coded notifications, mark read, pull-to-refresh. |
| **Profile** | PARTIAL | Theme, settings, admin section. "Your Summary" card planned (P1). |
| **Analytics / Insights** | COMPLETE | Spend insights with prioritization scoring, reward leakage detection. |
| **Portfolio Evolution** | COMPLETE | Health engine, value density, topology, strategy reflection, AI narratives. |
| **Personality / Behavioral** | COMPLETE | Behavioral memory engine, drift detection, personality profiles, adoption tracking. |

### 8.2 Admin Platform

| Feature | Status | Detail |
|---------|--------|--------|
| **Admin Dashboard** | COMPLETE | Module cards, usage guide, workflow modal. |
| **Master Catalog** | COMPLETE | Card CRUD, fee editing, reward rule viewing. |
| **Card Intelligence Review** | COMPLETE | Side-by-side source vs. extracted, approve/reject workflow, workspaces. |
| **Document Ingestion** | PARTIAL | PDF upload, URL scraping, chunking work. But: session cards use mock data, "New Card" is unwired, audit timeline is mock data, version diff is mock data. |
| **Field Review & Evidence** | PARTIAL | Field table renders. Uses `MOCK_FIELDS` — not wired to real API. |
| **Extraction Benchmarking** | COMPLETE | Dataset picker, evaluation suite runner, field-level accuracy, failure analysis. |
| **Extraction Playground** | COMPLETE | Single-field extraction tester, approve-as-ground-truth. |
| **Source Document Management** | COMPLETE | PDF upload, full-text search across chunks. |
| **Publish Preview** | COMPLETE | Customer mockup preview, confirm & publish flow. |
| **Feedback Review** | PARTIAL | Read-only view of user feedback. No moderation actions (close, respond, resolve). |
| **Card Monitoring** | STUBBED | `card_monitoring` table is empty — no cards have been through the URL ingestion pipeline. |

### 8.3 AI Systems

| Feature | Status | Detail |
|---------|--------|--------|
| **PDF/Statement Extraction** | COMPLETE | PyMuPDF chunking, keyword-based retrieval, DeepSeek extraction, Pydantic validation. |
| **Card Page Structured Extraction** | COMPLETE | URL scraping → Gemini/DeepSeek → structured card data. |
| **Narrative Synthesis** | COMPLETE | Deterministic metrics → semantic compression → LLM narration → validation. Well-architected safety properties. |
| **LangGraph Agents** | STUBBED | All 5 agent files (chat, recommendation, statement_parser, tools) are TODO-only stubs. |
| **Behavioral Memory** | COMPLETE | Heuristic confidence scoring, drift analysis, adoption tracking. |
| **Adaptive Intelligence** | COMPLETE | Archetype classification, fatigue suppression, coaching effectiveness. |
| **Benchmark Runner** | COMPLETE | Dataset-based evaluation, per-field scoring, failure analysis, snapshot recording. |
| **Merchant LLM Resolution** | COMPLETE | LLM recovery + discovery with fuzzy score gating. |

---

## 9. Remaining Work Roadmap

### 9.1 Launch Blockers (Must Complete Before Any Production Deployment)

| Priority | Item | Effort | Phase |
|----------|------|--------|-------|
| **P0** | Add `Depends(get_current_user)` + `Depends(get_current_admin)` to all unprotected endpoints (catalog, card-intelligence, merchant CRUD) | 1 day | Auth |
| **P0** | Fix Transaction IDOR — add `user_id` ownership check to `GET /transactions/card/{card_id}` | 1 hour | Auth |
| **P0** | Mitigate SSRF — implement URL allowlisting + internal IP blocking in `fetch_and_clean_card_page` | 2 hours | Security |
| **P0** | Add startup guard for JWT secret (`if requires_secure_secret: raise`) | 30 min | Security |
| **P0** | Wire `slowapi` rate limiting middleware (dependency already in pyproject.toml) | 2 hours | Security |
| **P0** | Remove `evaluate_rule_cap_allowance()` mock and wire real cap enforcement | 4 hours | Engine |

### 9.2 High ROI Improvements (Major Impact, Low Effort)

| Priority | Item | Effort |
|----------|------|--------|
| **P1** | Add idempotency composite unique constraint on transactions `(user_id, merchant_name, amount, transaction_date)` | 3 hours |
| **P1** | Make financial ledger append-only — restrict PATCH on transaction amounts, implement reversal/refund model | 4 hours |
| **P1** | Add `cumulative_spend` hydration from analytics module (currently always 0) | 4 hours |
| **P1** | Remove/merge `core/auth.py` dead file | 5 min |
| **P1** | Remove/merge `models/card.py` and `models/transaction.py` dead files | 5 min |
| **P1** | Extract `UserResponse` factory method to eliminate 5× duplication in `auth/service.py` | 30 min |
| **P1** | Change `get_current_admin_user` to raise `ForbiddenException(403)` instead of `UnauthorizedException(401)` | 5 min |
| **P1** | Replace `dict` type in `AdminReviewActionPayload.edited_json` with constrained Pydantic schema (fix JSON bomb) | 2 hours |
| **P1** | Add transaction amount upper bound (e.g., `le=10000000`) | 5 min |
| **P1** | Remove Adminer from production Docker Compose (keep for dev only) | 5 min |

### 9.3 Technical Debt (Should Address Soon)

| Priority | Item | Effort |
|----------|------|--------|
| **P2** | Unify two merchant systems — retire `merchant_intelligence/` in favor of `merchants/` | 1 day |
| **P2** | Unify reward engine — retire `evaluate_transaction_for_portfolio()` legacy path, standardize on `evaluate()` | 2 days |
| **P2** | Consolidate three LLM client patterns into single `ai/client.py` with consistent error handling | 1 day |
| **P2** | Add FK constraints to `transactions.user_id` and `transactions.user_card_id` | 2 hours |
| **P2** | Change `RewardRule.card_id` from `str` to `UUID` with FK to `card_catalogs.id` | 3 hours |
| **P2** | Change `Feedback` monetary columns from `float` to `Decimal` | 1 hour |
| **P2** | Complete `models/__init__.py` registry (7 missing models) | 30 min |
| **P2** | Define enums for all ingestion status/type fields currently stored as plain `str` | 3 hours |
| **P2** | Implement token revocation (token version column or Redis blacklist) | 4 hours |
| **P2** | Add refresh token rotation architecture | 6 hours |
| **P2** | Set up GitHub Actions CI: ruff, mypy, pytest, Playwright | 4 hours |
| **P2** | Add `datetime.utcnow` → `datetime.now(timezone.utc)` migration | 1 hour |

### 9.4 Nice-to-Haves (Can Wait)

| Priority | Item | Effort |
|----------|------|--------|
| **P3** | Implement LangGraph agents (currently 5 stub files) | 2 weeks |
| **P3** | Wire `cumulative_spend` from real analytics data | 1 day |
| **P3** | Add Redis caching layer for merchant resolution and LLM results | 2 days |
| **P3** | Implement `SearchCache` population (table exists, never written) | 2 hours |
| **P3** | Complete search results page (currently placeholder) | 1 day |
| **P3** | Add frontend unit tests (Jest + React Native Testing Library) | 3 days |
| **P3** | Replace hardcoded probability tiers in fee waiver with Bayesian model | 2 days |
| **P3** | Add password reset flow | 4 hours |
| **P3** | Fill frontend stub files (types/api.ts, types/card.ts, etc.) or remove | 2 hours |
| **P3** | Remove unused NativeWind/Tailwind configuration (~50KB dead weight) | 1 hour |
| **P3** | Wire ingestion screens to real APIs (replace MOCK_FIELDS, MOCK_SESSIONS) | 2 days |
| **P3** | Implement feedback moderation actions (close, respond, resolve) | 1 day |
| **P3** | Add production deployment configs (Kubernetes, Terraform, or equivalent) | 3 days |
| **P3** | Add observability: Prometheus metrics, structured logging aggregation, alerting | 1 week |

---

## 10. Key Findings Index

### Critical (4)
- **C1**: Unprotected card intelligence endpoints (no auth/RBAC) → SSRF, DoS, data poisoning
- **C2**: Unprotected card catalog mutation endpoints → global catalog compromise
- **C3**: SSRF via unvalidated URL in `fetch_and_clean_card_page` → internal network scan
- **C4**: Transaction IDOR → cross-user financial data exfiltration

### High (3)
- **H1**: JSON bomb via unconstrained `dict` in review/action → memory exhaustion DoS
- **H2**: Duplicate transaction farming → inflated spend metrics, spoofed milestones
- **H3**: `evaluate_rule_cap_allowance()` is a mock → cap enforcement silently broken

### Medium (6)
- **M1**: No token revocation
- **M2**: No rate limiting (slowapi dependency unused)
- **M3**: Mutable financial ledger (PATCH on amounts)
- **M4**: 46% of endpoints unauthenticated
- **M5**: Catalog data poisoning corrupts recommendations
- **M6**: Prompt injection in extraction pipeline (untrusted PDF/HTML → LLM)

### Architecture Debt (5)
- **A1**: Two parallel merchant systems (consolidate)
- **A2**: Two parallel reward engine implementations (unify)
- **A3**: Three separate LLM client patterns (consolidate)
- **A4**: 5 dead TODO files + 5 stub files in reward engine
- **A5**: 16 unused schema/type definitions across backend + frontend

### Data Integrity (4)
- **D1**: `transactions` table missing FK constraints
- **D2**: `RewardRule.card_id` is `str` not `UUID` (no FK)
- **D3**: `Feedback` uses `float` for money (not `Decimal`)
- **D4**: `cumulative_spend` always `0` — caps never enforced on accumulated spend

### Infrastructure (3)
- **I1**: No CI/CD pipeline
- **I2**: No production deployment configuration
- **I3**: Adminer exposed on port 9001

---

*Audit completed June 16, 2026. Based on comprehensive review of 705 files, 39 database tables, 24 API endpoints, 8 parallel deep-dive agent analyses, and 10 existing security review documents.*
