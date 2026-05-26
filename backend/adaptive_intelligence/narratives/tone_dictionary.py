class ToneDictionary:
    """
    Strict enforcement of observational, calm, and editorial vocabulary.
    Prohibits judgmental, guilt-driven, or gamified phrasing.
    """
    
    # Words strictly forbidden in any adaptive narrative
    BANNED_WORDS = [
        "failed", "fail", "missed", "bad", "wrong", "mistake",
        "should have", "could have", "urgent", "warning", "danger",
        "crushing it", "amazing", "awesome", "terrible", "poor",
        "losing money", "wasting"
    ]
    
    # Approved observational phrasing for trends
    APPROVED_IMPROVEMENT_PHRASES = [
        "improved steadily",
        "demonstrated stronger alignment",
        "showed increased optimization",
        "stabilized positively"
    ]
    
    APPROVED_STAGNANT_PHRASES = [
        "remains under-optimized",
        "shows recurring inefficiencies",
        "stabilized at current levels",
        "maintained previous patterns"
    ]
    
    @classmethod
    def validate_narrative(cls, text: str) -> bool:
        """
        Returns False if the text contains any banned vocabulary.
        """
        text_lower = text.lower()
        for word in cls.BANNED_WORDS:
            if word in text_lower:
                return False
        return True
