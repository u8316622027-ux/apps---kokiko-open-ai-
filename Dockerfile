FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install runtime dependencies
RUN pip install --no-cache-dir \
    "pydantic>=2.7.0" \
    "pydantic-settings>=2.3.0"

# Copy application source
COPY app ./app

EXPOSE 8000

CMD ["python", "-m", "app.interfaces.mcp.server", "--host", "0.0.0.0", "--port", "8000"]
