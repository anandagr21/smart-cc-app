# AI / LLM Integration Patterns

## Tech Stack

- **Framework:** LangGraph (agent orchestration)
- **LLM:** Configurable (OpenAI, Anthropic, etc.)
- **Agents:** `backend/agents/` — `recommendation_agent.py`, `statement_parser_agent.py`, `chat_agent.py`

---

## Rules

### AI Boundaries (CRITICAL)
- **AI NEVER computes financial rewards** — always call Reward Engine via Service
- **AI NEVER writes to database** — read-only with respect to financial data
- **AI NEVER assigns redemption rates** — these are declared in card config
- **AI NEVER interprets MCC codes** — MCC-to-category mapping is engine/config data
- **AI MUST only narrate** what the engine has computed — no re-computation or estimation

### What AI CAN Do
| Capability | Description |
|---|---|
| Intent classification | Identify user wants (recommendation, explanation, tracking) |
| Natural language parsing | Extract merchant, amount, category from user message |
| Statement parsing | Extract structured transactions from PDF/text |
| Explanation generation | Explain why a card was recommended in plain English |
| Comparative narration | Describe differences between top-ranked cards |
| Conversational routing | Decide which service to invoke |
| Follow-up suggestions | Suggest related questions or next actions |
| Error explanation | Surface user-friendly messages for ambiguous input |

---

## Agent Architecture

### Recommendation Agent
```
User Query → Parse intent (merchant, amount) → 
  Call CardRecommendationService → 
  Receive ranked engine output → 
  Generate explanation → Return response
```

### Statement Parser Agent
```
Uploaded statement (PDF/text) → 
  Extract text → LLM structured extraction → 
  Return Transaction objects → Service validates & saves
```
- LLM produces structured JSON — service layer validates before persistence
- Agent does NOT write to DB

### Chat / Q&A Agent
```
User question → Retrieve card data from service →
  Generate response from stored data →
  Never fabricate reward rates
```

---

## Preferred Patterns

### Agent Structure
```python
# backend/agents/recommendation_agent.py
from langgraph.graph import StateGraph
from backend.services.recommendation_service import RecommendationService

class RecommendationAgent:
    """Parses user intent, calls service, generates explanation."""
    
    def __init__(self, service: RecommendationService):
        self.service = service
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        # Define nodes: parse_intent → call_service → generate_response
        pass
    
    async def run(self, user_query: str, user_id: UUID) -> AgentResponse:
        # Route through graph
        pass
```

### Tool Definitions
```python
# backend/agents/tools/recommendation_tool.py
def create_recommendation_tool(service: RecommendationService):
    """LangGraph tool wrapping the recommendation service."""
    async def get_recommendation(merchant: str, amount: Decimal) -> dict:
        result = await service.get_best_card(user_id, context)
        return result.model_dump()
    return get_recommendation
```

### Prompt Template Pattern
```python
RECOMMENDATION_PROMPT = """You are a credit card recommendation assistant.
Given the ranked card list below, explain to the user why card X is best for {merchant}.

Ranked cards:
{ranked_cards}

Rules:
- Only describe what the reward engine computed
- Do not estimate or re-compute rewards
- Highlight caps, exclusions, or warnings if present
"""
```

---

## LangGraph Orchestration

### State Management
- Agents are stateless per request
- LangGraph state used only within a single agent run
- Graph manages multi-step conversation state
- Retry logic for transient LLM failures

### Guardrails
- Ensure AI does not fabricate financial data
- Validate LLM outputs against expected schemas
- Fallback to deterministic responses on LLM failure

---

## Anti-Patterns

- AI computing cashback, points, or reward values
- AI agents writing directly to database
- Bypassing the reward engine for speed
- Fabricating reward rates when DB/config is unavailable
- AI interpreting or guessing redemption rates
- Mixing AI orchestration with business logic
- Skipping output validation on LLM responses
- Long-running agent state — keep stateless per request

---

## Best Practices from Codebase

- Agents only call services — never repositories or engine directly
- AI agents are isolated in `backend/agents/` with separate tool definitions
- LLM prompts are template-based, not inline strings
- All agent outputs are structured and validated
- Boundary enforcement documented in `docs/AI_BOUNDARIES.md`