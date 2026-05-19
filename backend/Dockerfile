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

# Create virtual environment and install dependencies
RUN uv venv && uv sync --frozen --no-dev

# =========================
# Runtime Stage
# =========================
FROM python:3.12-slim

WORKDIR /app

# Runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtualenv
COPY --from=builder /app/.venv /app/.venv

# Copy source
COPY . .

# Activate venv
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000


# Environment
ENV ENVIRONMENT=development

EXPOSE 8000

# Run based on environment
CMD sh -c '\
    if [ "$ENVIRONMENT" = "development" ]; then \
        uvicorn main:app --reload --host 0.0.0.0 --port 8000; \
    else \
        gunicorn main:app \
            -k uvicorn.workers.UvicornWorker \
            -w 4 \
            -b 0.0.0.0:8000; \
    fi'