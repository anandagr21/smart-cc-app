"""
Module: backend.core
Responsibility: Shared backend infrastructure layer — configuration, database,
logging, exception handling, middleware, and standardized API responses.

Architectural Boundaries:
- Infrastructure modules only — no business logic, no domain knowledge.
- All public APIs are re-exported here for convenience.
- Domain modules import from `core` rather than reaching into submodules directly.
"""

from core.config import Settings, get_settings  # noqa: F401
from core.constants import (  # noqa: F401
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    PASSWORD_MIN_LENGTH,
)
from core.database import get_db, init_db, close_db  # noqa: F401
from core.dependencies import (  # noqa: F401
    get_settings_dependency,
    get_request_id,
    pagination_params,
)
from core.exceptions import (  # noqa: F401
    AppException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
    ValidationException,
    InternalServerException,
    ServiceUnavailableException,
    DatabaseException,
    ConfigurationException,
    app_exception_handler,
    pydantic_validation_handler,
    generic_exception_handler,
)
from core.logging import get_logger, setup_logging  # noqa: F401
from core.middleware import REQUEST_ID_HEADER, RequestIDMiddleware  # noqa: F401
from core.responses import (  # noqa: F401
    ErrorDetail,
    ErrorResponse,
    ListResponse,
    Meta,
    PaginatedResponse,
    SingleResponse,
    SuccessResponse,
)