# =========================
# Builder Stage
# =========================
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh

ENV PATH="/root/.local/bin:$PATH"

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Create virtual environment at /opt/venv so absolute paths match when copied to runtime
ENV UV_PROJECT_ENVIRONMENT="/opt/venv"
RUN uv sync --no-dev

# =========================
# Runtime Stage
# =========================
FROM python:3.12-slim

# Add AWS Lambda Web Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter
ENV PORT=8000

WORKDIR /app

# Runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtualenv to /opt/venv (outside /app) so bind mount doesn't wipe it
COPY --from=builder /opt/venv /opt/venv

# Copy source
COPY . .

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app

USER appuser

# Activate venv
ENV PATH="/opt/venv/bin:$PATH"

# Default environment
ENV ENVIRONMENT=development

EXPOSE 8000

# Run based on environment
CMD sh -c '\
    if [ "$ENVIRONMENT" = "development" ]; then \
        python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000; \
    else \
        gunicorn main:app \
            -k uvicorn.workers.UvicornWorker \
            -w 4 \
            -b 0.0.0.0:8000; \
    fi'
