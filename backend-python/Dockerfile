# Use the official Python Alpine image for a smaller footprint
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ /app/src/

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src
# Expose the port Uvicorn uses
EXPOSE 8000

# Run the FastAPI application
CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}
