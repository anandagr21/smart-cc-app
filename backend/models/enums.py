from enum import Enum

class UserRole(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"

class NotificationType(str, Enum):
    INSIGHT = "INSIGHT"
    SECURITY = "SECURITY"
    SYSTEM = "SYSTEM"
    CARD_INTELLIGENCE = "CARD_INTELLIGENCE"
    RECOMMENDATION = "RECOMMENDATION"
    WORKSPACE = "WORKSPACE"
