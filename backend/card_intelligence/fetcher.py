import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class DiscoveredLink:
    def __init__(self, url: str, title: str, text: str):
        self.url = url
        self.title = title
        self.text = text

class CrawlLog:
    def __init__(self, url: str, status: str, reason: Optional[str] = None):
        self.url = url
        self.status = status
        self.reason = reason

class UrlKnowledgeFetcher:
    """Fetches URLs and discovers related knowledge sources with strict guardrails."""
    
    # Target keywords that suggest a link points to a high-value document
    TARGET_KEYWORDS = [
        "terms", "conditions", "t&c", "mitc", "reward", 
        "benefits", "fees", "charges", "exclusions", "offers"
    ]
    
    def __init__(
        self, 
        max_discovered_links: int = 20, 
        same_domain_only: bool = True
    ):
        self.max_discovered_links = max_discovered_links
        self.same_domain_only = same_domain_only
        self.crawl_logs: List[CrawlLog] = []
        
    async def fetch_and_discover(self, url: str) -> tuple[str, str, List[DiscoveredLink]]:
        """
        Fetches the initial URL, returns the final resolved URL, the raw HTML,
        and a list of high-value discovered links.
        """
        self.crawl_logs = []
        
        # We need browser-like headers because banks heavily block raw python agents
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        
        async with httpx.AsyncClient(verify=False, follow_redirects=True, timeout=15.0) as client:
            try:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                
                final_url = str(response.url)
                raw_html = response.text
                
                self.crawl_logs.append(CrawlLog(url, "ACCEPTED", f"Resolved to {final_url}"))
                
                discovered_links = self._extract_high_value_links(final_url, raw_html)
                return final_url, raw_html, discovered_links
                
            except Exception as e:
                logger.error(f"Failed to fetch {url}: {e}")
                self.crawl_logs.append(CrawlLog(url, "FAILED", str(e)))
                raise ValueError(f"Could not fetch URL: {e}")

    def _extract_high_value_links(self, base_url: str, html: str) -> List[DiscoveredLink]:
        soup = BeautifulSoup(html, 'html.parser')
        base_domain = urlparse(base_url).netloc
        
        discovered = []
        seen_urls = set()
        
        # We also treat the current page as discovered if it's the root, but we usually want links
        for a_tag in soup.find_all('a', href=True):
            if len(discovered) >= self.max_discovered_links:
                break
                
            href = a_tag['href']
            text = a_tag.get_text(strip=True)
            title = a_tag.get('title', '')
            
            # Skip empty links or anchors
            if not href or href.startswith(('#', 'javascript:', 'mailto:', 'tel:')):
                continue
                
            full_url = urljoin(base_url, href)
            
            # Deduplicate
            if full_url in seen_urls:
                continue
                
            # Domain check
            if self.same_domain_only:
                link_domain = urlparse(full_url).netloc
                # Simple domain check (can be expanded to handle subdomains if needed)
                if base_domain not in link_domain and link_domain not in base_domain:
                    self.crawl_logs.append(CrawlLog(full_url, "REJECTED", "Different domain"))
                    continue
                    
            # Keyword check
            search_text = f"{href} {text} {title}".lower()
            if not any(kw in search_text for kw in self.TARGET_KEYWORDS):
                self.crawl_logs.append(CrawlLog(full_url, "REJECTED", "No target keywords matched"))
                continue
                
            seen_urls.add(full_url)
            discovered.append(DiscoveredLink(full_url, title or text, text))
            self.crawl_logs.append(CrawlLog(full_url, "ACCEPTED", "Matched keywords"))
            
        return discovered
