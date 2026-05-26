import pytest
from adaptive_intelligence.narratives.tone_dictionary import ToneDictionary

def test_banned_words_are_rejected():
    banned_sentences = [
        "You failed to optimize your dining spend.",
        "This was a bad mistake.",
        "Warning: urgent action required.",
        "You missed out on $50.",
        "You are losing money by not using this card."
    ]
    
    for sentence in banned_sentences:
        assert ToneDictionary.validate_narrative(sentence) is False

def test_approved_observational_phrasing_is_accepted():
    approved_sentences = [
        "Dining optimization improved steadily.",
        "Travel category remains under-optimized.",
        "Behavior stabilized positively.",
        "This category shows recurring inefficiencies."
    ]
    
    for sentence in approved_sentences:
        assert ToneDictionary.validate_narrative(sentence) is True
