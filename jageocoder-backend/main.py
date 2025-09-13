#!/usr/bin/env python3
"""
JAGeocoder Backend Service for Tokyo AI Taxi App
Provides precise Japanese address geocoding using JAGeocoder
"""

import os
import sys
import math
import asyncio
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

# JAGeocoder imports
try:
    import jageocoder
    JAGEOCODER_AVAILABLE = True
except ImportError:
    JAGEOCODER_AVAILABLE = False
    print("Warning: JAGeocoder not installed. Using fallback geocoding.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="JAGeocoder Backend for Tokyo AI Taxi",
    description="Precise Japanese address geocoding service",
    version="1.0.0"
)

# Enable CORS for your mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your app's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global JAGeocoder instance
geocoder_initialized = False
db_path = os.environ.get('JAGEOCODER_DB_PATH', '/app/jageocoder_data')

# Request/Response models
class GeocodeRequest(BaseModel):
    address: str
    
class GeocodeResponse(BaseModel):
    latitude: float
    longitude: float
    confidence: float
    formatted_address: str
    prefecture: str
    city: str

class DistanceRequest(BaseModel):
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float

class DistanceResponse(BaseModel):
    distance_km: float
    duration_minutes: int

async def initialize_jageocoder():
    """Initialize JAGeocoder database"""
    global geocoder_initialized
    
    if not JAGEOCODER_AVAILABLE:
        logger.warning("JAGeocoder not available")
        return False
        
    try:
        # Ensure data directory exists
        os.makedirs(db_path, exist_ok=True)
        
        # Initialize JAGeocoder
        if not geocoder_initialized:
            logger.info(f"Initializing JAGeocoder with database at {db_path}")
            
            # Check if database exists
            db_exists = os.path.exists(os.path.join(db_path, 'address.db')) or \
                       len(os.listdir(db_path)) > 0
            
            if not db_exists:
                logger.info("JAGeocoder database not found, downloading...")
                jageocoder.init(db_dir=db_path, download=True)
            else:
                logger.info("Using existing JAGeocoder database")
                jageocoder.init(db_dir=db_path, download=False)
            
            geocoder_initialized = True
            logger.info("JAGeocoder initialized successfully")
            
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize JAGeocoder: {e}")
        return False

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in kilometers"""
    # Convert latitude and longitude from degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    return c * r

def estimate_duration(distance_km: float) -> int:
    """Estimate travel time in minutes based on distance"""
    # Assume average speed of 30 km/h in urban areas
    # Add 5 minutes base time for pickup/dropoff
    average_speed_kmh = 30
    duration_minutes = (distance_km / average_speed_kmh) * 60 + 5
    return max(5, round(duration_minutes))

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting JAGeocoder Backend Service")
    await initialize_jageocoder()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "JAGeocoder Backend",
        "timestamp": datetime.now().isoformat(),
        "jageocoder_available": JAGEOCODER_AVAILABLE,
        "geocoder_initialized": geocoder_initialized
    }

@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "JAGeocoder Backend for Tokyo AI Taxi",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/geocode - Convert address to coordinates",
            "/distance - Calculate distance between points",
            "/health - Health check",
        ]
    }

@app.post("/geocode", response_model=GeocodeResponse)
async def geocode_address(request: GeocodeRequest):
    """Geocode a Japanese address using JAGeocoder"""
    
    if not JAGEOCODER_AVAILABLE or not geocoder_initialized:
        raise HTTPException(
            status_code=503, 
            detail="JAGeocoder service unavailable"
        )
    
    try:
        # Search for the address
        results = jageocoder.search(request.address)
        
        if not results:
            raise HTTPException(
                status_code=404,
                detail=f"Address not found: {request.address}"
            )
        
        # Get the best result
        best_result = results[0]
        
        # Extract coordinates and address components
        lat = best_result['y']
        lng = best_result['x']
        
        # Extract address components safely
        addr_parts = best_result.get('address', {})
        prefecture = addr_parts.get('pref', '')
        city = addr_parts.get('city', '')
        
        # Format full address
        formatted_address = best_result.get('matched', request.address)
        
        # Calculate confidence (JAGeocoder provides matching level)
        confidence = min(best_result.get('level', 0) / 10.0, 1.0)
        
        return GeocodeResponse(
            latitude=lat,
            longitude=lng,
            confidence=confidence,
            formatted_address=formatted_address,
            prefecture=prefecture,
            city=city
        )
        
    except Exception as e:
        logger.error(f"Geocoding error for '{request.address}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Geocoding failed: {str(e)}"
        )

@app.get("/geocode/{address}")
async def geocode_address_get(address: str):
    """GET endpoint for geocoding (for easy testing)"""
    request = GeocodeRequest(address=address)
    return await geocode_address(request)

@app.post("/distance", response_model=DistanceResponse)
async def calculate_distance(request: DistanceRequest):
    """Calculate distance and duration between two points"""
    
    try:
        # Calculate distance using haversine formula
        distance_km = haversine_distance(
            request.from_lat, request.from_lng,
            request.to_lat, request.to_lng
        )
        
        # Estimate duration
        duration_minutes = estimate_duration(distance_km)
        
        return DistanceResponse(
            distance_km=round(distance_km, 2),
            duration_minutes=duration_minutes
        )
        
    except Exception as e:
        logger.error(f"Distance calculation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Distance calculation failed: {str(e)}"
        )

@app.get("/distance")
async def calculate_distance_get(
    from_lat: float = Query(..., description="Origin latitude"),
    from_lng: float = Query(..., description="Origin longitude"),
    to_lat: float = Query(..., description="Destination latitude"),
    to_lng: float = Query(..., description="Destination longitude")
):
    """GET endpoint for distance calculation"""
    request = DistanceRequest(
        from_lat=from_lat,
        from_lng=from_lng,
        to_lat=to_lat,
        to_lng=to_lng
    )
    return await calculate_distance(request)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if app.debug else "An error occurred"
        }
    )

if __name__ == "__main__":
    # Get port from environment or default to 8000
    port = int(os.environ.get("PORT", 8000))
    
    # Run the server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
