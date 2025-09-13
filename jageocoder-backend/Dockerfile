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

# Download and setup JAGeocoder database
# This runs during build time to prepare the database
RUN python -c "
import jageocoder
import os
import urllib.request
import zipfile

# Set the database path
db_path = '/app/jageocoder_data'
os.makedirs(db_path, exist_ok=True)

print('Downloading JAGeocoder database...')
# Download the latest database
try:
    # Initialize jageocoder - this will download the database automatically
    jageocoder.init(db_dir=db_path, download=True)
    print('JAGeocoder database initialized successfully')
except Exception as e:
    print(f'Error initializing JAGeocoder: {e}')
    # Fallback: manual download if auto-download fails
    try:
        print('Attempting manual download...')
        url = 'https://www.info-proto.com/static/jageocoder/latest/jukyo_all_v21.zip'
        zip_path = '/tmp/jageocoder.zip'
        urllib.request.urlretrieve(url, zip_path)
        
        # Extract the zip file
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(db_path)
        
        # Initialize with the extracted data
        jageocoder.init(db_dir=db_path)
        print('Manual JAGeocoder setup completed')
    except Exception as e2:
        print(f'Manual download also failed: {e2}')
        print('JAGeocoder will be initialized at runtime')
"

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
