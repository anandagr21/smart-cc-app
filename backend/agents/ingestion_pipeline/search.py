from typing import Protocol, List
import logging

logger = logging.getLogger(__name__)

class SearchProvider(Protocol):
    def search(self, query: str) -> str:
        """Execute a search query and return the result text."""
        ...

class DuckDuckGoProvider:
    def __init__(self):
        try:
            from ddgs import DDGS
            self.ddgs = DDGS()
        except ImportError:
            logger.error("Failed to import ddgs. Please install it with `uv add ddgs`")
            self.ddgs = None

    def search(self, query: str) -> str:
        logger.info(f"DuckDuckGo search query: {query}")
        if not self.ddgs:
            return ""
            
        try:
            results = self.ddgs.text(query, max_results=3)
            # Format results into a single string
            formatted_results = []
            for r in results:
                formatted_results.append(f"Title: {r.get('title', '')}\nURL: {r.get('href', '')}\nSnippet: {r.get('body', '')}\n")
            return "\n".join(formatted_results)
        except Exception as e:
            logger.error(f"Search failed for query '{query}': {e}")
            return ""

def get_search_provider() -> SearchProvider:
    """Factory to get the default search provider."""
    return DuckDuckGoProvider()
