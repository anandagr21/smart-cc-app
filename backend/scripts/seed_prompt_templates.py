import asyncio
import os
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import async_session_factory
from models.ingestion import PromptTemplate
from sqlalchemy import select

PROMPTS = [
    {
        "name": "annual_fee_v1",
        "version": "v1",
        "field_name": "annual_fee",
        "description": "Standard prompt to extract the annual membership fee.",
        "template_text": """Task: Extract the {field_name} from the provided credit card MITC (Most Important Terms and Conditions) text.

You are provided with the Top retrieved chunks from the document.
Based strictly on these chunks, extract the exact value requested.

Return ONLY a valid JSON object matching this schema:
{{
  "value": number | null,
  "currency": "INR" | null,
  "explanation": "Brief explanation of where/why this was found, referencing the text.",
  "source_chunk_rank": number | null
}}

If the value is not present in the chunks, return value: null and explain why.

Context:
{context_text}
"""
    },
    {
        "name": "fee_waiver_spend_v1",
        "version": "v1",
        "field_name": "fee_waiver_spend",
        "description": "Standard prompt to extract fee waiver thresholds.",
        "template_text": """Task: Extract the {field_name} from the provided credit card MITC (Most Important Terms and Conditions) text.

You are provided with the Top retrieved chunks from the document.
Based strictly on these chunks, extract the exact value requested.

Return ONLY a valid JSON object matching this schema:
{{
  "value": number | null,
  "currency": "INR" | null,
  "period": "yearly" | null,
  "explanation": "Brief explanation of where/why this was found, referencing the text.",
  "source_chunk_rank": number | null
}}

If the value is not present in the chunks, return value: null and explain why.

Context:
{context_text}
"""
    },
    {
        "name": "welcome_bonus_v1",
        "version": "v1",
        "field_name": "welcome_bonus",
        "description": "Standard prompt to extract the welcome bonus points and condition.",
        "template_text": """Task: Extract the {field_name} from the provided credit card MITC (Most Important Terms and Conditions) text.

You are provided with the Top retrieved chunks from the document.
Based strictly on these chunks, extract the exact welcome bonus description.

Return ONLY a valid JSON object matching this schema:
{{
  "value": "string representing the bonus (e.g. 500 reward points)" | null,
  "condition": "string representing the activation condition (e.g. first transaction within 30 days)" | null,
  "explanation": "Brief explanation of where/why this was found, referencing the text.",
  "source_chunk_rank": number | null
}}

If the value is not present in the chunks, return value: null and explain why.

Context:
{context_text}
"""
    }
]

# We use the same standard template for joining_fee and renewal_fee as annual_fee
for f in ["joining_fee", "renewal_fee"]:
    PROMPTS.append({
        "name": f"{f}_v1",
        "version": "v1",
        "field_name": f,
        "description": f"Standard prompt to extract the {f}.",
        "template_text": PROMPTS[0]["template_text"]
    })

async def seed_templates():
    async with async_session_factory() as db:
        for p in PROMPTS:
            # Check if exists
            stmt = select(PromptTemplate).where(PromptTemplate.name == p["name"])
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"Template {p['name']} already exists. Updating...")
                existing.template_text = p["template_text"]
                existing.description = p["description"]
                existing.is_active = True
            else:
                print(f"Creating template {p['name']}...")
                template = PromptTemplate(**p)
                db.add(template)
                
        await db.commit()
        print("Done seeding prompt templates.")

if __name__ == "__main__":
    asyncio.run(seed_templates())
