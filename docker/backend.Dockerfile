FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app \
    XDG_CACHE_HOME=/home/appuser/.cache \
    HF_HOME=/home/appuser/.cache/huggingface \
    TORCH_HOME=/home/appuser/.cache/torch

# Install curl for healthcheck (slim image doesn't have it)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (cached layer — only rebuilds if requirements.txt changes)
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip && pip install -r /tmp/requirements.txt

# Copy application source
COPY backend /app/backend
COPY models /app/models

# Non-root user for security
RUN useradd -m -u 10001 appuser \
    && mkdir -p /home/appuser/.cache/huggingface /home/appuser/.cache/torch \
    && chown -R appuser:appuser /app /home/appuser/.cache
USER appuser

EXPOSE 8000

# Single worker because deepfake models are memory-heavy; increase only if RAM allows
CMD ["gunicorn", "-w", "1", "-b", "0.0.0.0:8000", "--timeout", "120", "backend.app:app"]
