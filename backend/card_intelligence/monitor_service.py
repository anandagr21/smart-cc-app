import hashlib
import requests
from bs4 import BeautifulSoup
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from uuid import UUID

from .monitor_models import CardMonitoring

def fetch_and_clean_card_page(url: str) -> str:
    """Scrapes card HTML, completely strips out layouts, navbars, and headers, leaving only relevant structural text."""
    headers = {"User-Agent": "SmartCC-Extraction-Bot/1.0"}
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
    except requests.RequestException as e:
        raise RuntimeError(f"Failed connection to bank website target: {e}")

    soup = BeautifulSoup(response.text, 'html.parser')
    
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
    current_hash = hashlib.md5(cleaned_text.encode('utf-8')).hexdigest()
    
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
