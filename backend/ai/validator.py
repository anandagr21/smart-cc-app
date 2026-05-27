"""
Module: backend.ai.validator
Responsibility: Narrative safety gate — enforces editorial quality and tone constraints.

This validator exists to prevent the LLM from producing outputs that would
undermine the product's premium, emotionally restrained character.

It is narrative safety infrastructure, not a content filter.
"""

import logging
import re

logger = logging.getLogger(__name__)

# Phrases that instantly destroy premium restraint — "AI smell" detection
AI_SMELL_PHRASES = [
    # Financial advisor tone
    "you should",
    "you need to",
    "consider",
    "we recommend",
    "i recommend",
    "it is recommended",
    # Hype and motivational language
    "great job",
    "well done",
    "smart decision",
    "great choice",
    "good job",
    "excellent",
    "your financial journey",
    "financial future",
    "you are becoming",
    "becoming more",
    "financial goals",
    # Gamification / fintech dashboard language
    "maximize",
    "unlock",
    "optimize smarter",
    "supercharge",
    "boost your",
    "level up",
    "earn more",
    "get more",
    "take advantage",
    "ai-powered",
    "powered by ai",
    # Urgency
    "immediately",
    "right away",
    "don't wait",
    "as soon as possible",
    "before it's too late",
    # Chatbot patterns
    "great question",
    "certainly",
    "of course",
    "happy to help",
    "i'm here",
    "as an ai",
]

# Emoji detection pattern
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F680-\U0001F6FF"  # transport & map
    "\U0001F1E0-\U0001F1FF"  # flags
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "]+",
    flags=re.UNICODE,
)

MAX_SENTENCES = 3


def _count_sentences(text: str) -> int:
    """Approximate sentence count by splitting on terminal punctuation."""
    sentences = re.split(r"[.!?]+", text.strip())
    return len([s for s in sentences if s.strip()])


def validate(narrative: str) -> tuple[bool, str]:
    """
    Validate a generated narrative against tone and quality constraints.

    Returns:
        (True, "") if valid
        (False, reason) if rejected
    """
    if not narrative or len(narrative.strip()) < 20:
        return False, "narrative too short"

    # Check for emojis
    if EMOJI_PATTERN.search(narrative):
        return False, "contains emoji"

    # Check sentence count
    sentence_count = _count_sentences(narrative)
    if sentence_count > MAX_SENTENCES:
        return False, f"too verbose: {sentence_count} sentences (max {MAX_SENTENCES})"

    # Check for AI smell phrases
    lower = narrative.lower()
    for phrase in AI_SMELL_PHRASES:
        if phrase in lower:
            logger.warning("Narrative rejected — AI smell detected: '%s'", phrase)
            return False, f"tone violation: '{phrase}'"

    # Check for raw numbers that might indicate score leakage
    # Allow years (4-digit numbers) but reject standalone decimals like "6.0", "7.5"
    if re.search(r"\b\d+\.\d+\b", narrative):
        return False, "contains raw numeric score"

    return True, ""
