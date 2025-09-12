# backend/setup_jageocoder.py
# Complete setup script for JAGeocoder with database download

import os
import sys
import subprocess
import urllib.request
import zipfile
import json
from pathlib import Path

class JAGeocoderSetup:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.data_dir = self.base_dir / "jageocoder_data"
        self.config_file = self.base_dir / "jageocoder_config.json"
        
    def install_jageocoder(self):
        """Install JAGeocoder package"""
        try:
            print("📦 Installing JAGeocoder...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", "jageocoder"])
            print("✅ JAGeocoder installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install JAGeocoder: {e}")
            return False
    
    def download_address_database(self):
        """Download the Japanese address database"""
        try:
            import jageocoder
            
            print("📥 Downloading Japanese address database...")
            print("⚠️  This may take several minutes and require ~2GB of disk space")
            
            # Create data directory
            self.data_dir.mkdir(exist_ok=True)
            
            # Initialize JAGeocoder (this downloads the database)
            jageocoder.init(db_dir=str(self.data_dir))
            
            print("✅ Address database downloaded and initialized")
            return True
            
        except Exception as e:
            print(f"❌ Database download failed: {e}")
            return False
    
    def verify_installation(self):
        """Verify JAGeocoder is working properly"""
        try:
            import jageocoder
            
            print("🔍 Testing JAGeocoder installation...")
            
            # Test geocoding
            results = jageocoder.search("東京都千代田区千代田1-1")
            if results:
                result = results[0]
                print(f"✅ Test successful: {result['fullname']}")
                print(f"   Coordinates: {result['y']}, {result['x']}")
                return True
            else:
                print("❌ Test failed: No results returned")
                return False
                
        except Exception as e:
            print(f"❌ Verification failed: {e}")
            return False
    
    def save_config(self):
        """Save configuration for the geocoding service"""
        config = {
            "jageocoder_installed": True,
            "database_path": str(self.data_dir),
            "installation_date": str(datetime.datetime.now()),
            "database_version": self.get_database_version()
        }
        
        with open(self.config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"✅ Configuration saved to {self.config_file}")
    
    def get_database_version(self):
        """Get the version of the installed database"""
        try:
            import jageocoder
            # This would need to be implemented based on JAGeocoder's API
            return "latest"
        except:
            return "unknown"
    
    def setup_complete(self):
        """Complete setup process"""
        print("🚀 Starting JAGeocoder setup for taxi app...")
        print("=" * 50)
        
        # Step 1: Install package
        if not self.install_jageocoder():
            return False
        
        # Step 2: Download database
        if not self.download_address_database():
            return False
        
        # Step 3: Verify installation
        if not self.verify_installation():
            return False
        
        # Step 4: Save configuration
        self.save_config()
        
        print("=" * 50)
        print("🎉 JAGeocoder setup completed successfully!")
        print(f"📊 Database location: {self.data_dir}")
        print("🚗 Ready for taxi app geocoding!")
        
        return True

# Enhanced geocoding service with proper initialization
import jageocoder
import datetime
import json
from pathlib import Path

class EnhancedGeocodingService:
    def __init__(self):
        self.initialized = False
        self.config_file = Path(__file__).parent / "jageocoder_config.json"
        self.data_dir = Path(__file__).parent / "jageocoder_data"
        self.cache = {}
        
        self.initialize_jageocoder()
    
    def load_config(self):
        """Load JAGeocoder configuration"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            print(f"Config load error: {e}")
            return {}
    
    def initialize_jageocoder(self):
        """Initialize JAGeocoder with proper error handling"""
        try:
            config = self.load_config()
            
            if not config.get('jageocoder_installed', False):
                print("❌ JAGeocoder not properly installed. Run setup_jageocoder.py first")
                return False
            
            # Initialize with custom database path if available
            if self.data_dir.exists():
                jageocoder.init(db_dir=str(self.data_dir))
            else:
                jageocoder.init()
            
            self.initialized = True
            print("✅ JAGeocoder initialized successfully")
            
            # Test with a simple query
            test_result = jageocoder.search("東京都")
            if test_result:
                print(f"🔍 Test query successful: {len(test_result)} results")
            
            return True
            
        except ImportError:
            print("❌ JAGeocoder package not installed. Run: pip install jageocoder")
            return False
        except Exception as e:
            print(f"❌ JAGeocoder initialization failed: {e}")
            print("💡 Try running setup_jageocoder.py to reinstall the database")
            return False
    
    def geocode_with_fallback(self, address):
        """Geocode with fallback to estimation"""
        if not self.initialized:
            return self.estimate_coordinates(address)
        
        try:
            # Use cached result if available
            if address in self.cache:
                return self.cache[address]
            
            results = jageocoder.search(address)
            
            if results:
                result = results[0]
                geocoded = {
                    'latitude': float(result['y']),
                    'longitude': float(result['x']),
                    'formatted_address': result['fullname'],
                    'confidence': result.get('score', 0.8),
                    'source': 'jageocoder',
                    'level': result.get('level', 0)
                }
                
                # Cache the result
                self.cache[address] = geocoded
                return geocoded
            else:
                # Fallback to estimation
                return self.estimate_coordinates(address)
                
        except Exception as e:
            print(f"Geocoding error for '{address}': {e}")
            return self.estimate_coordinates(address)
    
    def estimate_coordinates(self, address):
        """Fallback coordinate estimation for major areas"""
        # Major city coordinates for fallback
        city_coords = {
            '東京': (35.6762, 139.6503),
            '大阪': (34.6937, 135.5023),
            '名古屋': (35.1815, 136.9066),
            '札幌': (43.0642, 141.3469),
            '福岡': (33.5904, 130.4017),
            '仙台': (38.2682, 140.8694),
            '広島': (34.3853, 132.4553),
            '京都': (35.0116, 135.7681),
            '神戸': (34.6901, 135.1956),
            '横浜': (35.4437, 139.6380)
        }
        
        # Check for major cities in the address
        for city, coords in city_coords.items():
            if city in address:
                return {
                    'latitude': coords[0],
                    'longitude': coords[1],
                    'formatted_address': f"{city}周辺 (推定)",
                    'confidence': 0.5,
                    'source': 'estimation'
                }
        
        # Default to Tokyo if no match
        return {
            'latitude': 35.6762,
            'longitude': 139.6503,
            'formatted_address': "東京都内 (推定)",
            'confidence': 0.3,
            'source': 'default'
        }
    
    def calculate_accurate_distance(self, station_coords, destination_address):
        """Calculate distance using JAGeocoder or fallback"""
        dest_info = self.geocode_with_fallback(destination_address)
        
        if dest_info:
            distance = self.haversine_distance(
                station_coords[0], station_coords[1],
                dest_info['latitude'], dest_info['longitude']
            )
            
            return {
                'distance_km': distance,
                'destination_coords': (dest_info['latitude'], dest_info['longitude']),
                'accuracy': dest_info['source'],
                'confidence': dest_info['confidence'],
                'formatted_address': dest_info['formatted_address']
            }
        
        return None
    
    def haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points"""
        import math
        
        R = 6371  # Earth's radius in kilometers
        
        lat1_r = math.radians(lat1)
        lon1_r = math.radians(lon1)
        lat2_r = math.radians(lat2)
        lon2_r = math.radians(lon2)
        
        dlat = lat2_r - lat1_r
        dlon = lon2_r - lon1_r
        
        a = math.sin(dlat/2)**2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c

# Dockerfile for Railway deployment with JAGeocoder
dockerfile_content = '''
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Setup JAGeocoder (this will download the database)
RUN python setup_jageocoder.py

# Expose port
EXPOSE 3000

# Start the application
CMD ["python", "server.py"]
'''

# requirements.txt for the project
requirements_content = '''
flask==2.3.3
jageocoder>=2.0.0
gunicorn==21.2.0
requests==2.31.0
python-dotenv==1.0.0
'''

# Railway deployment script
railway_setup = '''
#!/bin/bash
# railway_deploy.sh
# Setup script for Railway deployment with JAGeocoder

echo "🚀 Deploying taxi app with JAGeocoder to Railway..."

# Install Railway CLI if not present
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    curl -fsSL https://railway.app/install.sh | sh
fi

# Login to Railway
echo "🔐 Please login to Railway..."
railway login

# Create new project
railway create taxi-geocoding-backend

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000

# Deploy
echo "🚢 Deploying to Railway..."
railway deploy

echo "✅ Deployment complete!"
echo "🌐 Your JAGeocoder backend is now live!"
'''

if __name__ == "__main__":
    setup = JAGeocoderSetup()
    success = setup.setup_complete()
    
    if success:
        print("\n🚗 Next steps:")
        print("1. Test the geocoding service")
        print("2. Deploy to Railway with the provided Dockerfile")
        print("3. Update your mobile app with the new backend URL")
    else:
        print("\n❌ Setup failed. Please check the errors above.")
