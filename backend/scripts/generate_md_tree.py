import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join('/Users/anandagrawal/work/smart-cc-app/backend')))

from sqlalchemy import select
from core.database import async_session_factory, init_db
from models.card_catalog import CardCatalog
from collections import defaultdict

async def generate_tree_md():
    await init_db()
    async with async_session_factory() as session:
        result = await session.execute(select(CardCatalog).order_by(CardCatalog.bank_name, CardCatalog.card_name))
        cards = result.scalars().all()
        
    grouped = defaultdict(list)
    for card in cards:
        grouped[card.bank_name].append(card)
        
    md_content = '# Supported Credit Cards Catalog\n\n'
    md_content += f'**Total Cards Indexed:** {len(cards)}\n\n'
    md_content += '```text\n'
    md_content += '💳 Smart CC Catalog\n'
    
    banks = sorted(grouped.keys())
    for i, bank in enumerate(banks):
        is_last_bank = (i == len(banks) - 1)
        bank_prefix = '└── ' if is_last_bank else '├── '
        md_content += f'{bank_prefix}🏦 {bank}\n'
        
        bank_cards = grouped[bank]
        child_indent = '    ' if is_last_bank else '│   '
        
        for j, card in enumerate(bank_cards):
            is_last_card = (j == len(bank_cards) - 1)
            card_prefix = '└── ' if is_last_card else '├── '
            md_content += f'{child_indent}{card_prefix}📄 {card.card_name} ({card.network})\n'
            
    md_content += '```\n'
        
    filepath = '/Users/anandagrawal/work/smart-cc-app/SUPPORTED_CARDS.md'
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(md_content)
        
    print('Tree structured Markdown file created.')

asyncio.run(generate_tree_md())
