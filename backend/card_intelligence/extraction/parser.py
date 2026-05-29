import logging
import fitz  # PyMuPDF
from bs4 import BeautifulSoup
from typing import Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

MAX_DOCUMENT_CHARS = 100_000

class DocumentParser:
    """
    Parses raw text from various document formats (PDF, HTML).
    """
    
    @staticmethod
    def parse_pdf(file_path: str) -> Tuple[str, int]:
        """
        Parses a PDF file and returns (extracted_text, page_count).
        Injects a '--- PAGE X ---' marker between pages so the LLM can cite page numbers.
        """
        text_parts = []
        try:
            with fitz.open(file_path) as doc:
                page_count = len(doc)
                for i in range(page_count):
                    page = doc.load_page(i)
                    page_text = page.get_text("text").strip()
                    if page_text:
                        text_parts.append(f"--- PAGE {i+1} ---\n{page_text}")
                
            full_text = "\n\n".join(text_parts)
            return full_text, page_count
            
        except Exception as e:
            logger.error(f"Failed to parse PDF {file_path}: {e}")
            raise
            
    @staticmethod
    def parse_html(file_path: str) -> Tuple[str, int]:
        """
        Parses an HTML file and returns (extracted_text, page_count).
        For HTML, page_count is conventionally 1.
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
                
            # Remove scripts, styles, etc.
            for script in soup(["script", "style", "nav", "footer"]):
                script.decompose()
                
            # Get text
            text = soup.get_text(separator="\n", strip=True)
            return f"--- PAGE 1 ---\n{text}", 1
            
        except Exception as e:
            logger.error(f"Failed to parse HTML {file_path}: {e}")
            raise

    @staticmethod
    def truncate_text(text: str, max_chars: int = MAX_DOCUMENT_CHARS) -> str:
        """
        Truncates the document text to prevent exceeding LLM context limits.
        If truncated, logs a warning.
        """
        if len(text) > max_chars:
            logger.warning(f"Document exceeds MAX_DOCUMENT_CHARS ({len(text)} > {max_chars}). Truncating.")
            # In Phase 3B this will be replaced with chunking/vector search.
            # For now, we simply truncate.
            return text[:max_chars] + "\n\n...[DOCUMENT TRUNCATED DUE TO LENGTH]..."
        return text
