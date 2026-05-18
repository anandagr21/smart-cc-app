# AI Boundaries & Responsibilities

## 1. Purpose

This document defines the strict boundary between:
- What the **AI layer** (LangGraph agents, LLM calls) is allowed to do
- What the **Deterministic Reward Engine** must always do
- What the **Services layer** controls

These boundaries exist to ensure correctness, auditability, and testability of all financial outputs.

---

## 2. What AI CAN Do

| Capability | Description |
|---|---|
| **Intent classification** | Identify what the user wants (recommendation, explanation, card tracking) |
| **Natural language parsing** | Extract merchant name, amount, category from user message |
| **Statement parsing** | Extract structured transaction data from uploaded PDF/text statements |
| **Explanation generation** | Explain why a card was recommended, in plain English |
| **Comparative narration** | Describe differences between top-ranked cards in human terms |
| **Conversational routing** | Decide which tool/service to invoke based on user query |
| **Milestone status narration** | Summarize progress toward a spending milestone in plain language |
| **Follow-up suggestions** | Suggest related questions or next actions |
| **Error explanation** | Surface user-friendly messages for missing data or ambiguous input |

---

## 3. What AI CANNOT Do

| Prohibition | Reason |
|---|---|
| **Calculate cashback amounts** | Must be done by the deterministic engine |
| **Calculate reward points** | Must be done by the deterministic engine |
| **Apply or interpret caps** | Cap logic lives in the engine only |
| **Determine exclusions** | Exclusion rules are engine-only |
| **Rank cards by reward value** | Ranking is an engine output |
| **Assign redemption rates** | These are declared in card config, not inferred |
| **Interpret MCC codes** | MCC-to-category mapping is engine/config data |
| **Modify stored financial data** | AI agents are read-only with respect to financial records |
| **Bypass the engine for speed** | No shortcuts. Always call the engine via services. |

---

## 4. AI Agent Responsibilities (LangGraph)

### 4.1 Recommendation Agent
- Accept user query ("which card for Zomato?")
- Parse merchant and optional amount
- Call `CardRecommendationService` with structured params
- Receive ranked engine output
- Generate explanation from ranked results
- Return response to user

### 4.2 Statement Parser Agent
- Accept uploaded statement (PDF or text)
- Extract individual transactions (date, merchant, amount, category)
- Return structured `Transaction` objects to the service layer
- The service layer saves transactions; the agent does not write to DB

### 4.3 Chat / Q&A Agent
- Answer general questions about cards, categories, rewards
- Surface card-specific benefits from the card definition store
- Never fabricate reward rates — always retrieve from DB/config

### 4.4 Milestone Agent
- Query milestone progress from the service layer
- Narrate progress in plain language
- Suggest which merchants/categories to spend at to reach milestone faster

---

## 5. Deterministic Engine Responsibilities

The reward engine is solely responsible for:

| Responsibility |
|---|
| Cashback computation |
| Points computation |
| Multiplier application |
| Exclusion evaluation |
| Cap enforcement |
| Merchant-to-tier matching |
| Card ranking by effective rupee value |
| Normalization to rupee value |
| Breakdown / audit trail generation |

See `REWARD_ENGINE.md` for full specification.

---

## 6. LangGraph Orchestration Responsibilities

| Responsibility | Description |
|---|---|
| **Graph state management** | Manage multi-step conversation or analysis state |
| **Tool routing** | Choose which service to call based on intent |
| **Retry logic** | Handle transient failures in LLM calls |
| **Output formatting** | Structure agent responses for API consumption |
| **Agent chaining** | Compose multiple agent steps into a single workflow |
| **Guardrails enforcement** | Ensure AI does not fabricate financial data |

---

## 7. Statement Parsing Responsibilities

| Step | Owner |
|---|---|
| Receive raw PDF/text | Statement Parser Agent |
| Extract text from PDF | AI utility function (e.g., pdfplumber wrapper) |
| Parse transactions from text | LLM (structured output mode) |
| Validate parsed transactions | Service layer (schema validation) |
| Persist transactions | Repository layer |
| Return structured result | Service layer → API |

The LLM produces **structured output** (JSON with defined schema). The service layer validates it before persistence. The LLM never writes to the database.

---

## 8. Explanation Generation Responsibilities

The AI explanation layer receives:
- The ranked card list with `effective_reward_inr` and `breakdown` from the engine
- The user's query context

It produces:
- A natural language explanation ("Card A gives you ₹50 cashback because...")
- Highlights of the top-ranked card's benefit
- Any warnings (e.g., cap nearly reached, exclusion applied)

**Rule:** The AI must only narrate what the engine has computed. It must not re-compute, estimate, or add qualifiers that change the financial meaning of engine outputs.
