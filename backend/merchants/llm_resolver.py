"""
Module: backend.merchants.llm_resolver
Responsibility: LLM-based merchant resolution using Gemini Flash.

Architectural Boundaries:
- Two operations only: RECOVERY (pick from candidates) and DISCOVERY (identify new).
- Uses langchain-google-genai with gemini-1.5-flash (low cost, low latency).
- Uses .with_structured_output() for type-safe JSON responses.
- MUST NOT be called when fuzzy score >= 95 (cost guard enforced by resolution_engine).
- MUST NOT be called when fuzzy score < 50 (no LLM for clearly unknown inputs).

Cost Targets:
    LLM Recovery: < 500ms
    LLM Discovery: < 1s
    Target LLM call rate: < 10% of total resolutions
"""

from __future__ import annotations

import logging
from typing import Optional
from pydantic import BaseModel, Field

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from core.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LLM Setup
# ---------------------------------------------------------------------------

_settings = get_settings()

def _get_llm() -> ChatOpenAI:
    """Lazily instantiate the OpenAI LLM."""
    if not _settings.openai_api_key:
        raise ValueError("OpenAI API key is missing. Please set OPENAI_API_KEY.")
    
    return ChatOpenAI(
        model="deepseek-v4-flash",
        api_key=_settings.openai_api_key,
        base_url=_settings.openai_base_url if _settings.openai_base_url else None,
        temperature=0,
        max_retries=2,
    )


# ---------------------------------------------------------------------------
# LLM Recovery Schemas
# ---------------------------------------------------------------------------

class LLMRecoveryResult(BaseModel):
    """Result from LLM Recovery stage."""
    merchant_name: str = Field(description="Canonical merchant name from the candidates list, or UNKNOWN")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score 0.0-1.0")
    reason_code: str = Field(description="TYPO, ABBREVIATION, ALIAS, or UNKNOWN")


class LLMDiscoveryResult(BaseModel):
    """Result from LLM Discovery stage."""
    merchant_name: str = Field(description="Identified merchant name, or UNKNOWN")
    category: str = Field(description="Merchant category (food, grocery, travel, ecommerce, etc.)")
    subcategory: Optional[str] = Field(default=None, description="Subcategory if applicable")
    merchant_type: str = Field(
        description="One of: BRAND, LOCAL_BUSINESS, ONLINE_STORE, UTILITY, BANK, GOVERNMENT, EDUCATION, TRAVEL, HEALTHCARE, UNKNOWN"
    )
    mcc_hint: Optional[str] = Field(
        default=None,
        description="MCC code hint (4-digit string, e.g. '5411' for grocery). Null if uncertain."
    )
    is_known_brand: bool = Field(description="Whether this appears to be a nationally known brand")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score 0.0-1.0")


# ---------------------------------------------------------------------------
# LLM Recovery
# ---------------------------------------------------------------------------

_RECOVERY_SYSTEM = """You are a merchant name resolution assistant.
Your job is to select the most likely canonical merchant from a provided candidate list.

Rules:
- You MUST only select from the provided candidates list.
- Do NOT invent or create new merchant names.
- Return UNKNOWN if you are not confident any candidate matches.
- Confidence must be between 0.0 and 1.0.

Reason codes:
- TYPO: Input is a misspelling of the candidate (e.g., "flipcart" → "Flipkart")
- ABBREVIATION: Input is a shortened form (e.g., "amzn" → "Amazon")
- ALIAS: Input is a known alternate name (e.g., "fk internet" → "Flipkart")
- UNKNOWN: No confident match found
"""

async def recover(
    user_input: str,
    candidates: list[str],
) -> LLMRecoveryResult:
    """Use Gemini Flash to select the best merchant from fuzzy candidates.

    Only called when fuzzy score is in the 80-94 range (LLM_RECOVERY tier).
    Candidates are pre-filtered top fuzzy matches — LLM picks the best one.

    Args:
        user_input: The original normalized user input.
        candidates: List of canonical merchant names from fuzzy search.

    Returns:
        LLMRecoveryResult with chosen merchant_name and confidence.
    """
    candidates_text = "\n".join(f"- {c}" for c in candidates)
    prompt = f"""User Input: "{user_input}"

Candidates:
{candidates_text}

Select the most likely merchant from the candidates list above.
If none match with confidence >= 0.7, return UNKNOWN.

You MUST respond in strictly valid JSON format with exactly these keys:
- "merchant_name": string
- "confidence": float between 0.0 and 1.0
- "reason_code": string (TYPO, ABBREVIATION, ALIAS, or UNKNOWN)
"""

    try:
        llm = _get_llm()
        structured_llm = llm.with_structured_output(LLMRecoveryResult, method="json_mode")
        
        result = await structured_llm.ainvoke([
            SystemMessage(content=_RECOVERY_SYSTEM),
            HumanMessage(content=prompt),
        ])
        logger.info(
            "LLM Recovery: input=%r → %r (conf=%.2f, reason=%s)",
            user_input, result.merchant_name, result.confidence, result.reason_code
        )
        return result
    except Exception as e:
        logger.error("LLM Recovery failed for input=%r: %s", user_input, e)
        return LLMRecoveryResult(
            merchant_name="UNKNOWN",
            confidence=0.0,
            reason_code="UNKNOWN",
        )


# ---------------------------------------------------------------------------
# LLM Discovery
# ---------------------------------------------------------------------------

_DISCOVERY_SYSTEM = """You are a merchant categorization engine for an Indian financial app.
Your job is to identify information about a merchant that may not be in a database yet.

Rules:
- Do NOT map the input to existing known merchants — treat this as a new merchant.
- Do NOT hallucinate brands. If you are not sure, return UNKNOWN.
- merchant_type must be one of: BRAND, LOCAL_BUSINESS, ONLINE_STORE, UTILITY, BANK, GOVERNMENT, EDUCATION, TRAVEL, HEALTHCARE, UNKNOWN
- mcc_hint should be a 4-digit MCC code string if you know it (e.g., "5411" for grocery stores, "5812" for restaurants, "4111" for transportation). Return null if uncertain.
- If the input appears to be gibberish or a test string, return UNKNOWN with confidence 0.0.
- Confidence must be between 0.0 and 1.0.
"""

async def discover(user_input: str) -> LLMDiscoveryResult:
    """Use Gemini Flash to identify a merchant not present in the database.

    Only called when fuzzy score is in the 50-79 range (LLM_DISCOVERY tier).
    Does NOT reference existing merchants — purely identifies the new entity.

    Args:
        user_input: The original normalized user input.

    Returns:
        LLMDiscoveryResult with merchant details and confidence.
        If confidence < 0.90, caller should treat as UNKNOWN/ask-user.
    """
    prompt = f"""Input Merchant: "{user_input}"

Determine:
1. What merchant this likely refers to
2. Its category, subcategory, and merchant type
3. An MCC code hint if you know it
4. Whether it appears to be a known brand
5. Your confidence level (0.0-1.0)

If this appears to be gibberish, a test string, or you cannot determine with confidence,
return merchant_name="UNKNOWN" and confidence=0.0.

You MUST respond in strictly valid JSON format with exactly these keys:
- "merchant_name": string
- "category": string
- "subcategory": string or null
- "merchant_type": string (BRAND, LOCAL_BUSINESS, ONLINE_STORE, UTILITY, BANK, GOVERNMENT, EDUCATION, TRAVEL, HEALTHCARE, UNKNOWN)
- "mcc_hint": string or null
- "is_known_brand": boolean
- "confidence": float between 0.0 and 1.0
"""

    try:
        llm = _get_llm()
        structured_llm = llm.with_structured_output(LLMDiscoveryResult, method="json_mode")
        
        result = await structured_llm.ainvoke([
            SystemMessage(content=_DISCOVERY_SYSTEM),
            HumanMessage(content=prompt),
        ])
        logger.info(
            "LLM Discovery: input=%r → %r (conf=%.2f, type=%s, mcc=%s)",
            user_input, result.merchant_name, result.confidence,
            result.merchant_type, result.mcc_hint
        )
        return result
    except Exception as e:
        logger.error("LLM Discovery failed for input=%r: %s", user_input, e)
        return LLMDiscoveryResult(
            merchant_name="UNKNOWN",
            category="unknown",
            subcategory=None,
            merchant_type="UNKNOWN",
            mcc_hint=None,
            is_known_brand=False,
            confidence=0.0,
        )
