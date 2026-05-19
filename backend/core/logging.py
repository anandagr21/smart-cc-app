"""
Module: backend.core.logging
Responsibility: Centralized logger configuration and helpers.

Architectural Boundaries:
- Configure the Python `logging` module at app startup.
- Provide a `get_logger` helper for consistent logger naming.
- Support both JSON (structured) and text formats based on settings.
- Request ID awareness for correlation across log entries.

Decision: A single `setup_logging()` call in `main.py` configures all loggers.
Individual modules use `get_logger(__name__)` — no need to configure per module.
This aligns with skills/logging.md conventions.
"""

from __future__ import annotations

import logging
import sys
from typing import Any

from core.config import get_settings

LOGGER_NAME_MAX_LENGTH = 50


def _create_json_formatter() -> logging.Formatter:
    """Create a JSON-structured log formatter for production use.

    Returns:
        A logging.Formatter that outputs JSON lines.
    """

    class JSONFormatter(logging.Formatter):
        """Minimal structured JSON formatter — no external deps."""

        def format(self, record: logging.LogRecord) -> str:
            import json

            log_record: dict[str, Any] = {
                "timestamp": self.formatTime(record, self.datefmt),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
            }

            # Include request_id from extra if present
            if hasattr(record, "request_id"):
                log_record["request_id"] = record.request_id

            # Include any extra attributes passed via logger.info(..., extra={...})
            for key in dir(record):
                if key not in {
                    "args",
                    "asctime",
                    "created",
                    "exc_info",
                    "exc_text",
                    "filename",
                    "funcName",
                    "levelname",
                    "levelno",
                    "lineno",
                    "module",
                    "msecs",
                    "message",
                    "msg",
                    "name",
                    "pathname",
                    "process",
                    "processName",
                    "relativeCreated",
                    "stack_info",
                    "thread",
                    "threadName",
                    "request_id",
                }:
                    value = getattr(record, key, None)
                    if value is not None and not key.startswith("_"):
                        log_record[key] = value

            if record.exc_info and record.exc_info[0]:
                log_record["exception"] = self.formatException(record.exc_info)

            return json.dumps(log_record, default=str)

    return JSONFormatter()


def _create_text_formatter() -> logging.Formatter:
    """Create a human-readable text formatter for development use.

    Returns:
        A logging.Formatter with timestamp, level, logger name, and message.
    """
    fmt = "%(asctime)s | %(levelname)-8s | %(name)-{name_len}s | %(message)s".format(
        name_len=LOGGER_NAME_MAX_LENGTH,
    )
    return logging.Formatter(fmt, datefmt="%Y-%m-%dT%H:%M:%S")


def setup_logging() -> None:
    """Configure the root logger and all application loggers.

    Reads log_level and log_format from Settings.
    Should be called once at application startup in main.py.

    Usage:
        # In main.py, before creating the FastAPI app:
        from core.logging import setup_logging
        setup_logging()
    """
    settings = get_settings()
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    is_json = settings.log_format == "json"
    formatter = _create_json_formatter() if is_json else _create_text_formatter()

    # Root logger — captures everything
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers to avoid duplicates on reload
    root_logger.handlers.clear()

    # Console handler (stdout)
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    # Quiet noisy third-party loggers
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    # Log startup confirmation
    root_logger.info(
        "Logging configured",
        extra={
            "level": settings.log_level.upper(),
            "format": "json" if is_json else "text",
            "environment": settings.environment,
        },
    )


def get_logger(name: str) -> logging.Logger:
    """Return a logger instance for the given module name.

    Prefer __name__ as the argument so log output reflects the originating module.

    Args:
        name: Typically __name__ from the calling module.

    Returns:
        A configured logging.Logger instance.

    Usage:
        from core.logging import get_logger
        logger = get_logger(__name__)
        logger.info("User authenticated", extra={"user_id": str(user.id)})
    """
    return logging.getLogger(name)