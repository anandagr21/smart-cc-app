import hashlib
import requests
import socket
import ipaddress
from bs4 import BeautifulSoup
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from uuid import UUID

import urllib.parse
from fastapi import HTTPException

from .monitor_models import CardMonitoring

ALLOWED_BANK_DOMAINS = {"sbicard.com", "hdfcbank.com", "icicibank.com", "axisbank.com"}

def fetch_and_clean_card_page(url_or_html: str) -> str:
    """Scrapes card HTML, completely strips out layouts, navbars, and headers, leaving only relevant structural text. Can accept a URL or raw HTML string."""
    if url_or_html.startswith("http://") or url_or_html.startswith("https://"):
        parsed_url = urllib.parse.urlparse(url_or_html)
        hostname = parsed_url.hostname or ""
        
        if not any(hostname == d or hostname.endswith(f".{d}") for d in ALLOWED_BANK_DOMAINS):
            raise ValueError(f"SSRF Protection: Domain '{hostname}' is not in the allowed banking domains list.")
            
        # Robust DNS Resolution Check
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for result in addr_info:
                ip_str = result[4][0]
                ip_obj = ipaddress.ip_address(ip_str)
                if (
                    ip_obj.is_private or 
                    ip_obj.is_loopback or 
                    ip_obj.is_link_local or 
                    ip_obj.is_reserved or 
                    ip_obj.is_multicast
                ):
                    raise ValueError(f"SSRF Protection: Domain resolved to a prohibited IP address ({ip_str}).")
        except socket.gaierror:
            raise ValueError(f"SSRF Protection: Domain '{hostname}' failed DNS resolution.")
            
        headers = {"User-Agent": "SmartCC-Extraction-Bot/1.0"}
        try:
            response = requests.get(url_or_html, headers=headers, timeout=15)
            response.raise_for_status()
            html_content = response.text
        except requests.RequestException as e:
            raise RuntimeError(f"Failed connection to bank website target: {e}")
    else:
        # Assume it's raw HTML source text pasted directly
        html_content = url_or_html

    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Strip unnecessary webpage noise components
    for element in soup(["script", "style", "nav", "footer", "header", "noscript", "sidebar"]):
        element.extract()
        
    text_content = soup.get_text(separator="\n")
    lines = [line.strip() for line in text_content.splitlines() if line.strip()]
    return "\n".join(lines)

async def execute_daily_hash_check(card_id: UUID, url: str, db: AsyncSession) -> bool:
    """
    Compares yesterday's page layout text hash to today's layout text hash.
    Returns True if a bank change is detected (triggering the pipeline), False otherwise.
    """
    cleaned_text = fetch_and_clean_card_page(url)
    current_hash = hashlib.sha256(cleaned_text.encode('utf-8')).hexdigest()
    
    stmt = select(CardMonitoring).where(CardMonitoring.card_id == card_id)
    result = await db.execute(stmt)
    monitoring_record = result.scalar_one_or_none()
    
    if monitoring_record is None:
        monitoring_record = CardMonitoring(
            card_id=card_id,
            card_url=url,
            last_seen_hash=current_hash,
            stored_text=cleaned_text
        )
        db.add(monitoring_record)
        await db.commit()
        return True
        
    if current_hash == monitoring_record.last_seen_hash:
        return False  # No structural textual updates on the webpage. Skip processing.
        
    # Changes detected! Update verification baseline tracking and trigger admin alert
    monitoring_record.last_seen_hash = current_hash
    monitoring_record.stored_text = cleaned_text
    db.add(monitoring_record)
    await db.commit()
    return True
