import os
import json
import logging
from typing import Tuple, Dict, Any
from datetime import datetime

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

from core.config import get_settings
from .schemas import CardIntelligenceExtraction, ExtractionTarget

logger = logging.getLogger(__name__)

class LangChainExtractor:
    """
    Handles interactions with the LLM via LangChain.
    Uses .with_structured_output() to guarantee JSON schemas.
    """
    def __init__(self):
        self.settings = get_settings()
        self.provider = os.getenv("CARD_INTELLIGENCE_PROVIDER", "gemini").lower()
        self.model_name = os.getenv("CARD_INTELLIGENCE_MODEL", "gemini-2.5-pro")
        
        self.llm = self._initialize_llm()

    def _initialize_llm(self):
        logger.info(f"Initializing LLM with provider: {self.provider}, model: {self.model_name}")
        
        if self.provider == "gemini":
            return ChatGoogleGenerativeAI(
                model=self.model_name,
                temperature=0.0,
                max_retries=2
            )
        elif self.provider == "openai" or self.provider == "deepseek":
            from core.config import get_settings
            settings = get_settings()
            
            kwargs = {
                "model": self.model_name,
                "temperature": 0,
                "api_key": settings.openai_api_key or os.getenv("OPENAI_API_KEY")
            }
            base_url = settings.openai_base_url or os.getenv("OPENAI_BASE_URL")
            if base_url:
                kwargs["base_url"] = base_url
                
            return ChatOpenAI(**kwargs)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")

    def extract_intelligence(
        self, 
        document_text: str,
        target: ExtractionTarget,
        template_name: str = "mitc_prompt"
    ) -> Tuple[CardIntelligenceExtraction, str, Dict[str, Any]]:
        """
        Extracts structured intelligence from the document text.
        
        Returns:
            - The parsed Pydantic object
            - The raw JSON response string
            - Usage metadata (tokens, etc. if available)
        """
        template_path = os.path.join(
            os.path.dirname(__file__), 
            "templates", 
            f"{template_name}.txt"
        )
        
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Template not found at {template_path}")
            
        with open(template_path, "r", encoding="utf-8") as f:
            prompt_text = f.read()
            
        prompt = ChatPromptTemplate.from_template(prompt_text)
        
        logger.info(f"Invoking extraction chain with {self.model_name} for card: {target.card_name}...")
        
        try:
            # DeepSeek does not support response_format / json_schema structured output.
            # For deepseek, we use plain JSON mode: ask for raw text, then parse manually.
            if self.provider == "deepseek":
                result = self._extract_via_json_prompt(prompt, document_text, target)
            else:
                # Gemini + OpenAI support with_structured_output natively
                extractor_chain = prompt | self.llm.with_structured_output(CardIntelligenceExtraction)
                result = extractor_chain.invoke({
                    "document_text": document_text,
                    "bank_name": target.bank_name,
                    "card_name": target.card_name,
                    "network": target.network or "N/A"
                })
            
            # Post-extraction validation
            extracted_name = result.extracted_card_name.lower().strip()
            target_name = target.card_name.lower().strip()
            
            # We do a loose substring check because the LLM might return "SimplyClick SBI Card" vs "SBI SimplyClick"
            if target_name not in extracted_name and extracted_name not in target_name:
                logger.warning(f"Validation failed: Extracted card name '{result.extracted_card_name}' does not match target '{target.card_name}'.")
                raise ValueError(f"Extracted rules appear to be for a different card: {result.extracted_card_name}")
            
            raw_response = result.model_dump()
            
            metadata = {
                "tokens_used": 0, 
                "cost_estimate": 0.0,
                "model": self.model_name,
                "provider": self.provider
            }
            
            return result, json.dumps(raw_response), metadata
            
        except Exception as e:
            logger.error(f"LLM Extraction failed: {e}")
            raise

    def _extract_via_json_prompt(
        self,
        prompt: ChatPromptTemplate,
        document_text: str,
        target: ExtractionTarget,
    ) -> CardIntelligenceExtraction:
        """
        Fallback extraction for models that don't support structured output (e.g. DeepSeek).
        Appends a JSON schema instruction to the prompt and parses the raw text response.
        """
        schema_json = json.dumps(CardIntelligenceExtraction.model_json_schema(), indent=2)
        json_instruction = (
            f"\n\nYou MUST respond with a single valid JSON object that strictly follows this schema. "
            f"Do NOT include any markdown fences, explanation, or extra text — only the raw JSON object.\n\nSchema:\n{schema_json}"
        )
        
        # Build the full prompt text by appending the JSON instruction
        chain = prompt | self.llm
        raw_response = chain.invoke({
            "document_text": document_text + json_instruction,
            "bank_name": target.bank_name,
            "card_name": target.card_name,
            "network": target.network or "N/A"
        })
        
        # Extract text content from AIMessage
        raw_text = raw_response.content if hasattr(raw_response, "content") else str(raw_response)
        
        # Strip markdown fences if present
        raw_text = raw_text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()
        
        logger.debug(f"Raw DeepSeek response (first 500 chars): {raw_text[:500]}")
        
        parsed = json.loads(raw_text)
        return CardIntelligenceExtraction(**parsed)
