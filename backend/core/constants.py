"""
Module: backend.core.constants
Responsibility: Shared constants to avoid magic numbers/strings.

Architectural Boundaries:
- Pure constants only — no logic, no I/O, no dependencies.
- DRY principle: define once, import everywhere.
- No domain-specific values — those belong in their respective modules.

Decision: A single constants file prevents magic numbers scattered across the
codebase. Domain-specific constants (e.g., reward caps) live in their own modules;
this file holds only truly shared infrastructure constants.
"""

from enum import Enum

# ---- Pagination Defaults ----
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# ---- Auth ----
PASSWORD_MIN_LENGTH = 8

# ---- Rate Limiting ----
# TODO: Move to config when rate limiting is implemented
DEFAULT_RATE_LIMIT_PER_MINUTE = 60

# ---- Request ----
REQUEST_ID_HEADER = "X-Request-ID"

# ---- Health Status Values ----
HEALTHY = "healthy"
DEGRADED = "degraded"
DB_CONNECTED = "connected"
DB_DISCONNECTED = "disconnected"

# ---- Environment Values (for use in settings validation) ----
DEVELOPMENT = "development"
STAGING = "staging"
PRODUCTION = "production"
TESTING = "testing"


class Environment(str, Enum):
    """Supported deployment environments."""

    DEVELOPMENT = DEVELOPMENT
    STAGING = STAGING
    PRODUCTION = PRODUCTION
    TESTING = TESTING