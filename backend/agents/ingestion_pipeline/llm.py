import os
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.language_models import BaseChatModel
from core.config import get_settings

logger = logging.getLogger(__name__)

import json
from pydantic import BaseModel

def get_llm(structured: bool = False, schema=None) -> BaseChatModel:
    """
    Returns the configured LLM based on the project settings.
    """
    settings = get_settings()
    provider = settings.card_intelligence_provider.lower()
    model_name = settings.card_intelligence_model
    
    logger.info(f"Initializing Ingestion Pipeline LLM with provider: {provider}, model: {model_name}")
    
    llm = None
    if provider == "gemini":
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            temperature=0.0,
            max_retries=2
        )
    elif provider in ("openai", "deepseek"):
        kwargs = {
            "model": model_name,
            "temperature": 0.0,
            "api_key": settings.openai_api_key or os.getenv("OPENAI_API_KEY")
        }
        base_url = settings.openai_base_url or os.getenv("OPENAI_BASE_URL")
        if base_url:
            kwargs["base_url"] = base_url
        llm = ChatOpenAI(**kwargs)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")
        
    if structured and schema and provider != "deepseek":
        return llm.with_structured_output(schema)
        
    return llm

async def invoke_structured(prompt_template, inputs: dict, schema: type[BaseModel]):
    settings = get_settings()
    provider = settings.card_intelligence_provider.lower()
    
    if provider == "deepseek":
        llm = get_llm(structured=False)
        schema_json = json.dumps(schema.model_json_schema(), indent=2)
        messages = prompt_template.format_messages(**inputs)
        if messages and messages[0].type == 'system':
            messages[0].content += f"\n\nYou MUST respond with a single valid JSON object that strictly follows this schema. Do NOT include any markdown fences, explanation, or extra text — only the raw JSON object.\n\nSchema:\n{schema_json}"
        
        raw_response = await llm.ainvoke(messages)
        raw_text = getattr(raw_response, "content", str(raw_response)).strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()
            
        # Sometimes DeepSeek still leaves trailing ```
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3].strip()
            
        parsed = json.loads(raw_text)
        return schema(**parsed)
    else:
        llm = get_llm(structured=True, schema=schema)
        chain = prompt_template | llm
        return await chain.ainvoke(inputs)
