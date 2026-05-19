"""
Module: backend.core.logging
Responsibility: Structured logging configuration for the entire application.

Architectural Boundaries:
- Configures Python's `logging` module once at startup.
- Provides a `get_logger` factory that creates module-level loggers.
- JSON format in production for machine parsing; text format in development.

Decision: A centralized logging setup ensures consistent log format across all
modules. JSON structured logging enables log aggregation systems (ELK, Datadog,
etc.) to parse and index log fields. The `extra` dict on each log call provides
structured context (request_id, user_id, etc.).
"""

import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any

from core.config import get_settings

settings = get_settings()


class JsonFormatter(logging.Formatter):
    """Structured JSON log formatter for production.

    Outputs log records as JSON objects with standard fields:
    timestamp, level, logger, message, and any extra context.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include extra context (request_id, user_id, duration_ms, etc.)
        # These are passed via the `extra` dict in logging calls.
        for key, value in record.__dict__.items():
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
            }:
                log_entry[key] = value

        # Include exception info if present
        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = {
                "type": type(record.exc_info[1]).__name__,
                "message": str(record.exc_info[1]),
            }

        return json.dumps(log_entry, default=str)


def setup_logging() -> None:
    """Configure application-wide logging.

    Called once at application startup. Sets up:
    - JSON structured logging in production
    - Human-readable text format in development
    - Root logger level from settings
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))

    # Remove any existing handlers to avoid duplicates on hot-reload
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))

    if settings.log_format == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        )

    root_logger.addHandler(handler)

    # Silence noisy third-party loggers
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger for the given module name.

    Usage in any module:
        from core.logging import get_logger
        logger = get_logger(__name__)
    """
    return logging.getLogger(name)