import sys
import os
import requests
from bs4 import BeautifulSoup

def test_url(url):
    print(f"Fetching URL: {url}")
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Remove scripts and styles
    for script in soup(["script", "style"]):
        script.extract()
        
    raw_text = soup.get_text(separator='\n')
    # Collapse multiple newlines
    import re
    raw_text = re.sub(r'\n+', '\n', raw_text).strip()
    
    print(f"Extracted {len(raw_text)} characters.")
    print("Preview:")
    print(raw_text[:500])
    
if __name__ == "__main__":
    url = "https://www.sbicard.com/en/personal/credit-cards/simplyclick-sbi-card.html"
    test_url(url)
