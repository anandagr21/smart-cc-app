import os
import logging
from typing import List, Optional, Literal
from pydantic import BaseModel, Field

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from core.config import get_settings

logger = logging.getLogger(__name__)

from .schemas import RewardRule, CardMilestone, StructuredCardData

class StructuredParser:
    def __init__(self):
        self.settings = get_settings()
        self.provider = self.settings.card_intelligence_provider.lower()
        self.model_name = self.settings.card_intelligence_model
        
        logger.info(f"Initializing StructuredParser with provider: {self.provider}, model: {self.model_name}")
        
        if self.provider == "gemini":
            self.llm = ChatGoogleGenerativeAI(
                model=self.model_name,
                temperature=0.0,
                max_retries=2
            )
        elif self.provider == "openai" or self.provider == "deepseek":
            kwargs = {
                "model": self.model_name,
                "temperature": 0.0,
                "api_key": self.settings.openai_api_key or os.getenv("OPENAI_API_KEY")
            }
            base_url = self.settings.openai_base_url or os.getenv("OPENAI_BASE_URL")
            if base_url:
                kwargs["base_url"] = base_url
            self.llm = ChatOpenAI(**kwargs)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
        
        # Bind the schema using with_structured_output
        self.structured_llm = self.llm.with_structured_output(StructuredCardData)

    async def extract_structured_card_data(self, cleaned_markdown_text: str) -> StructuredCardData:
        """
        Uses Gemini's native JSON structured output to guarantee strict schema adherence,
        or falls back to manual JSON parsing for DeepSeek.
        """
        system_prompt = (
            "You are a credit card terms parsing engine. Your single task is to convert raw webpage text "
            "into a structured JSON database profile. Closely analyze footnotes for point limits, spending caps, "
            "and exclusions like 'wallet reloads or utility payments'. Do not extrapolate or guess values. "
            "If a cap, limit, or milestone condition is omitted in the source text, set its schema field to null."
        )
        
        if self.provider == "deepseek":
            import json
            schema_json = json.dumps(StructuredCardData.model_json_schema(), indent=2)
            system_prompt += (
                "\n\nYou MUST respond with a single valid JSON object that strictly follows this schema. "
                "Do NOT include any markdown fences, explanation, or extra text — only the raw JSON object.\n\nSchema:\n{schema}"
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("user", "{text}")
            ])
            
            chain = prompt | self.llm
            raw_response = await chain.ainvoke({
                "text": cleaned_markdown_text, 
                "schema": schema_json
            })
            
            raw_text = raw_response.content if hasattr(raw_response, "content") else str(raw_response)
            raw_text = raw_text.strip()
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
                raw_text = raw_text.strip()
            
            parsed = json.loads(raw_text)
            return StructuredCardData(**parsed)
        else:
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt + "\n\nAnalyze the document provided between the <document> and </document> tags."),
                ("user", "<document>\n{text}\n</document>")
            ])
            
            chain = prompt | self.structured_llm
            result = await chain.ainvoke({"text": cleaned_markdown_text})
            return result
