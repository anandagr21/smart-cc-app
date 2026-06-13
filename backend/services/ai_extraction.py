import json
import logging
from typing import Any, Optional, Literal
from uuid import UUID

from openai import AsyncOpenAI
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from models.ingestion import (
    SourceChunk,
    ExtractionRun,
    ExtractedFieldCandidate,
    SourceDocument,
    PromptTemplate
)

logger = logging.getLogger(__name__)
settings = get_settings()

SUPPORTED_FIELDS = [
    "annual_fee",
    "joining_fee",
    "renewal_fee",
    "fee_waiver_spend",
    "welcome_bonus"
]

class BaseExtractionSchema(BaseModel):
    explanation: str = Field(description="Brief explanation of where/why this was found, referencing the text.")
    source_chunk_rank: Optional[int] = Field(default=None)

class FeeExtractionSchema(BaseExtractionSchema):
    value: Optional[float] = Field(default=None)
    currency: Optional[str] = Field(default=None)

class FeeWaiverExtractionSchema(BaseExtractionSchema):
    value: Optional[float] = Field(default=None)
    currency: Optional[str] = Field(default=None)
    period: Optional[str] = Field(default=None)

class WelcomeBonusExtractionSchema(BaseExtractionSchema):
    value: Optional[str] = Field(default=None)
    condition: Optional[str] = Field(default=None)


def get_openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url if settings.openai_base_url else None
    )

async def _retrieve_chunks(db: AsyncSession, document_id: UUID, field_name: str) -> list[SourceChunk]:
    """
    Retrieves chunks with field keywords and bank-specific overrides.
    Returns the top chunks matching the field intent.
    """
    # Base keywords
    FIELD_KEYWORDS = {
        "annual_fee": ["annual fee", "membership fee", "annual membership", "renewal fee", "renewal membership fee", "card membership fee"],
        "joining_fee": ["joining fee", "first year fee", "entrance fee", "first year membership"],
        "renewal_fee": ["renewal fee", "second year", "subsequent year"],
        "fee_waiver_spend": ["waived", "reversal", "spend", "waiver"],
        "welcome_bonus": ["welcome", "bonus", "activation", "first transaction"]
    }
    
    BANK_OVERRIDES = {
        "HDFC": {
            "annual_fee": ["renewal membership fee", "membership fee"]
        },
        "AMEX": {
            "annual_fee": ["card membership fee"]
        }
    }
    
    keywords = FIELD_KEYWORDS.get(field_name, [field_name.replace("_", " ")])
    
    # Attempt to find bank name
    from models.ingestion import SourceDocument
    from models.card_catalog import CardCatalog
    doc = await db.get(SourceDocument, document_id)
    if doc and doc.card_catalog_id:
        card = await db.get(CardCatalog, doc.card_catalog_id)
        if card and card.bank_name:
            issuer_upper = card.bank_name.upper()
            for bank, overrides in BANK_OVERRIDES.items():
                if bank in issuer_upper and field_name in overrides:
                    # Prepend overrides so they match first/higher
                    keywords = overrides[field_name] + keywords
    
    query = select(SourceChunk).where(SourceChunk.document_id == document_id)
    
    clauses = []
    for kw in keywords:
        clauses.append(SourceChunk.chunk_text.ilike(f"%{kw}%"))
        
    if clauses:
        from sqlalchemy import or_
        query = query.where(or_(*clauses))
        
    query = query.order_by(SourceChunk.page_number)
    query = query.limit(5)
    
    result = await db.execute(query)
    return list(result.scalars().all())


async def extract_single_field(db: AsyncSession, document_id: UUID, field_name: str, prompt_version: str = "v1") -> ExtractedFieldCandidate:
    """
    Extracts a single structured field from a PDF document using Deepseek and top chunks.
    Fetches the PromptTemplate dynamically and validates the output.
    """
    if field_name not in SUPPORTED_FIELDS:
        raise ValueError(f"Field {field_name} is not supported. Supported: {SUPPORTED_FIELDS}")
        
    # Fetch Prompt Template
    template_name = f"{field_name}_{prompt_version}"
    stmt = select(PromptTemplate).where(PromptTemplate.name == template_name)
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()
    
    if not template:
        raise ValueError(f"PromptTemplate {template_name} not found in database. Run seed script.")

    # 1. Retrieve
    chunks = await _retrieve_chunks(db, document_id, field_name)
    
    # Create the run record
    run = ExtractionRun(
        document_id=document_id,
        field_name=field_name,
        model_name="deepseek-chat",
        prompt_template_id=template.id
    )
    db.add(run)
    await db.flush()
    
    if not chunks:
        candidate = ExtractedFieldCandidate(
            extraction_run_id=run.id,
            normalized_field_name=field_name,
            status="REJECTED",
            explanation="No relevant chunks found in the document."
        )
        db.add(candidate)
        await db.commit()
        await db.refresh(candidate)
        return candidate

    # 2. Build Context
    context_text = ""
    for rank, chunk in enumerate(chunks, 1):
        context_text += f"\\n--- Chunk Rank {rank} (Page {chunk.page_number}) ---\\n{chunk.chunk_text}\\n"
        
    prompt = template.template_text.format(field_name=field_name, context_text=context_text)

    import time
    start_time = time.time()
    try:
        response = await client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a precise data extraction assistant. You only output valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" },
            temperature=0.0
        )
        latency_ms = int((time.time() - start_time) * 1000)
        
        usage = response.usage
        prompt_tokens = usage.prompt_tokens if usage else 0
        completion_tokens = usage.completion_tokens if usage else 0
        # rough DeepSeek-chat pricing: $0.14/1M input, $0.28/1M output
        cost = (prompt_tokens / 1_000_000 * 0.14) + (completion_tokens / 1_000_000 * 0.28)
        
        content = response.choices[0].message.content
        parsed = json.loads(content)
        
        # Pydantic validation based on field_name
        if field_name in ["annual_fee", "joining_fee", "renewal_fee"]:
            validated = FeeExtractionSchema(**parsed)
            extracted_value = {"value": validated.value, "currency": validated.currency}
        elif field_name == "fee_waiver_spend":
            validated = FeeWaiverExtractionSchema(**parsed)
            extracted_value = {"value": validated.value, "currency": validated.currency, "period": validated.period}
        elif field_name == "welcome_bonus":
            validated = WelcomeBonusExtractionSchema(**parsed)
            extracted_value = {"value": validated.value, "condition": validated.condition}
        else:
            raise ValueError(f"Unknown validation schema for {field_name}")

        explanation = validated.explanation
        rank = validated.source_chunk_rank
        
        source_chunk_id = None
        retrieval_score = 1.0
        
        if rank is not None and isinstance(rank, int) and 1 <= rank <= len(chunks):
            source_chunk_id = chunks[rank-1].id
            
        candidate = ExtractedFieldCandidate(
            extraction_run_id=run.id,
            normalized_field_name=field_name,
            candidate_value=extracted_value,
            source_chunk_id=source_chunk_id,
            retrieval_rank=rank,
            retrieval_score=retrieval_score,
            explanation=explanation,
            status="EXTRACTED"
        )
        
    except ValidationError as e:
        logger.error(f"JSON Schema Validation failed: {e.errors()}")
        candidate = ExtractedFieldCandidate(
            extraction_run_id=run.id,
            normalized_field_name=field_name,
            status="REJECTED",
            explanation=f"LLM produced invalid JSON schema: {e.errors()}"
        )
    except Exception as e:
        logger.error(f"Extraction failed: {str(e)}")
        candidate = ExtractedFieldCandidate(
            extraction_run_id=run.id,
            normalized_field_name=field_name,
            status="REJECTED",
            explanation=f"LLM Extraction failed: {str(e)}"
        )
        
    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)
    
    candidate._retrieved_chunks_debug = [
        {
            "id": c.id,
            "rank": r + 1,
            "score": 1.0,
            "page_number": c.page_number,
            "text": c.chunk_text
        } for r, c in enumerate(chunks)
    ]
    
    candidate._metrics_debug = locals().get("latency_ms") and {
        "latency_ms": latency_ms,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "cost_usd": cost,
        "prompt_version": prompt_version
    } or None
    
    return candidate
