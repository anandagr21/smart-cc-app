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
            # For DeepSeek, we'd use ChatOpenAI but override base_url in env.
            # Assuming standard OpenAI setup.
            return ChatOpenAI(
                model=self.model_name,
                temperature=0.0,
                max_retries=2
            )
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
        
        # We need the raw output for the snapshot, but `with_structured_output` 
        # returns the parsed object directly. To get both, we could invoke it,
        # serialize the result back to JSON, or use an intermediate step.
        # Since we just want the raw LLM response for debugging, serializing the 
        # parsed object is a perfectly acceptable proxy of what it returned.
        
        extractor_chain = prompt | self.llm.with_structured_output(CardIntelligenceExtraction)
        
        logger.info(f"Invoking extraction chain with {self.model_name} for card: {target.card_name}...")
        
        try:
            result: CardIntelligenceExtraction = extractor_chain.invoke({
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
            
            # TODO: Track actual tokens_used if available in the response metadata.
            # Langchain's with_structured_output hides the raw AI message metadata sometimes,
            # but for now we'll just return 0.
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
