class PortfolioNarrativeEngine:
    """
    Generates calm, editorial observations based on portfolio evolution metrics.
    """

    @staticmethod
    def generate_narrative(
        complexity: float, 
        redundancy: float, 
        density: float, 
        burden: float
    ) -> str:
        """
        Synthesizes a single editorial observation.
        """
        # Prioritize observations based on the strongest signals
        
        if burden > 7.0:
            return "Recent behavior suggests stronger preference for portfolio simplicity over category maximization."
        
        if redundancy > 6.0:
            return "Several cards in your wallet currently overlap in strategic coverage."
            
        if density < 0.5:
            return "Your portfolio contains premium structures that may be underutilized relative to their fees."
            
        if complexity > 8.0:
            return "Your wallet topology is highly complex, which may be increasing optimization fatigue."
            
        if density > 3.0 and complexity < 5.0:
            return "Your portfolio is operating efficiently with strong value density and low cognitive complexity."
            
        return "Your portfolio structure remains stable and aligned with baseline optimization."
