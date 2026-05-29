import os
import hashlib
import re
from pathlib import Path
from typing import Protocol
from fastapi import UploadFile

STORAGE_ROOT = Path("storage/card_docs")

def generate_card_slug(bank_name: str, card_name: str) -> str:
    """Generates a clean slug for storage paths."""
    combined = f"{bank_name}_{card_name}".lower()
    return re.sub(r'[^a-z0-9]+', '_', combined).strip('_')

class KnowledgeStorageProvider(Protocol):
    async def save_document(
        self, file: UploadFile, bank_name: str, card_name: str, source_type: str, version: int
    ) -> tuple[str, str]:
        ...

    async def save_html(
        self, html_content: str, bank_name: str, card_name: str, file_name: str, version: int
    ) -> tuple[str, str]:
        ...

class LocalKnowledgeStorage:
    """Abstracts document storage logic to allow future cloud migration."""
    
    @staticmethod
    async def save_document(
        file: UploadFile, 
        bank_name: str,
        card_name: str, 
        source_type: str, 
        version: int
    ) -> tuple[str, str]:
        """
        Saves file locally and computes checksum.
        Returns (storage_path, checksum_hash).
        """
        slug = generate_card_slug(bank_name, card_name)
        source_type_lower = source_type.lower()
        
        # Build hierarchy: storage/card_docs/{slug}/{source_type}/v{version}/
        dir_path = STORAGE_ROOT / slug / source_type_lower / f"v{version}"
        dir_path.mkdir(parents=True, exist_ok=True)
        
        # Ensure secure filename
        safe_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', file.filename or 'doc.pdf')
        file_path = dir_path / safe_filename
        
        # Read chunks to compute hash and write file
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "wb") as f:
            while chunk := await file.read(8192):
                sha256_hash.update(chunk)
                f.write(chunk)
                
        # Reset file pointer if needed by caller (though usually not needed)
        await file.seek(0)
        
        return str(file_path), sha256_hash.hexdigest()

    @staticmethod
    async def save_html(
        html_content: str, 
        bank_name: str,
        card_name: str, 
        file_name: str, 
        version: int
    ) -> tuple[str, str]:
        """
        Saves raw HTML locally and computes checksum.
        Returns (storage_path, checksum_hash).
        """
        slug = generate_card_slug(bank_name, card_name)
        
        # Build hierarchy: storage/card_docs/{slug}/html/v{version}/
        dir_path = STORAGE_ROOT / slug / "html" / f"v{version}"
        dir_path.mkdir(parents=True, exist_ok=True)
        
        safe_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', file_name)
        if not safe_filename.endswith('.html'):
            safe_filename += '.html'
            
        file_path = dir_path / safe_filename
        
        # Write HTML and compute hash
        content_bytes = html_content.encode('utf-8')
        sha256_hash = hashlib.sha256(content_bytes).hexdigest()
        
        with open(file_path, "wb") as f:
            f.write(content_bytes)
            
        return str(file_path), sha256_hash
