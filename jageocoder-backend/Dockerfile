# Use Python 3.11 slim image for smaller size
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed for JAGeocoder
RUN apt-get update && apt-get install -y \
    build-essential \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Create directory for JAGeocoder database
RUN mkdir -p /app/jageocoder_data

# Create a setup script for JAGeocoder database
RUN echo 'import jageocoder\nimport os\ndb_path = "/app/jageocoder_data"\nos.makedirs(db_path, exist_ok=True)\nprint("Downloading JAGeocoder database...")\ntry:\n    jageocoder.init(db_dir=db_path, download=True)\n    print("JAGeocoder database initialized successfully")\nexcept Exception as e:\n    print(f"Error initializing JAGeocoder: {e}")\n    print("JAGeocoder will be initialized at runtime")' > setup_jageocoder.py

# Run the setup script to download JAGeocoder database
RUN python setup_jageocoder.py || echo "JAGeocoder setup failed, will retry at runtime"

# Expose port 8000
EXPOSE 8000

# Set environment variables
ENV PYTHONPATH=/app
ENV JAGEOCODER_DB_PATH=/app/jageocoder_data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Start command
CMD ["python", "main.py"]
