# backend/geocoding_service.py
# JAGeocoder integration for precise Japanese address geocoding

import jageocoder
from flask import Flask, request, jsonify
import sqlite3
import json
import os
from typing import Dict, List, Tuple, Optional

class JapaneseGeocodingService:
    def __init__(self):
        self.initialized = False
        self.init_jageocoder()
    
    def init_jageocoder(self):
        """Initialize JAGeocoder with Japanese address database"""
        try:
            # Initialize JAGeocoder (downloads database if needed)
            jageocoder.init()
            self.initialized = True
            print("✅ JAGeocoder initialized successfully")
        except Exception as e:
            print(f"❌ JAGeocoder initialization failed: {e}")
            self.initialized = False
    
    def geocode_address(self, address: str) -> Optional[Dict]:
        """
        Geocode a Japanese address to coordinates
        Returns: {lat, lng, formatted_address, confidence}
        """
        if not self.initialized:
            return None
            
        try:
            # Clean and normalize the address
            cleaned_address = self.clean_address(address)
            
            # Geocode using JAGeocoder
            results = jageocoder.search(cleaned_address)
            
            if not results:
                return None
            
            # Get the best result
            best_result = results[0]
            
            return {
                'latitude': float(best_result['y']),
                'longitude': float(best_result['x']),
                'formatted_address': best_result['fullname'],
                'confidence': best_result.get('score', 0),
                'level': best_result.get('level', 0),  # Address precision level
                'original_query': address
            }
            
        except Exception as e:
            print(f"Geocoding error for '{address}': {e}")
            return None
    
    def reverse_geocode(self, lat: float, lng: float, radius: int = 100) -> Optional[Dict]:
        """
        Reverse geocode coordinates to Japanese address
        """
        if not self.initialized:
            return None
            
        try:
            # JAGeocoder reverse search
            results = jageocoder.reverse((lng, lat), radius)
            
            if not results:
                return None
            
            best_result = results[0]
            
            return {
                'address': best_result['fullname'],
                'latitude': lat,
                'longitude': lng,
                'distance': best_result.get('distance', 0),
                'level': best_result.get('level', 0)
            }
            
        except Exception as e:
            print(f"Reverse geocoding error for {lat},{lng}: {e}")
            return None
    
    def calculate_distance(self, station_coords: Tuple[float, float], 
                          destination_address: str) -> Optional[float]:
        """
        Calculate distance between station and destination address
        Returns distance in kilometers
        """
        # Geocode destination
        dest_coords = self.geocode_address(destination_address)
        if not dest_coords:
            return None
        
        # Calculate distance using Haversine formula
        return self.haversine_distance(
            station_coords[0], station_coords[1],
            dest_coords['latitude'], dest_coords['longitude']
        )
    
    def haversine_distance(self, lat1: float, lng1: float, 
                          lat2: float, lng2: float) -> float:
        """Calculate distance between two points using Haversine formula"""
        import math
        
        # Convert to radians
        lat1_r = math.radians(lat1)
        lng1_r = math.radians(lng1)
        lat2_r = math.radians(lat2)
        lng2_r = math.radians(lng2)
        
        # Haversine formula
        dlat = lat2_r - lat1_r
        dlng = lng2_r - lng1_r
        a = math.sin(dlat/2)**2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth's radius in kilometers
        r = 6371
        
        return c * r
    
    def clean_address(self, address: str) -> str:
        """Clean and normalize Japanese address for better geocoding"""
        # Remove extra whitespace
        address = address.strip()
        
        # Convert full-width numbers to half-width
        address = address.translate(str.maketrans(
            '０１２３４５６７８９',
            '0123456789'
        ))
        
        # Add common address prefixes if missing
        if not any(pref in address for pref in ['県', '都', '府', '道']):
            # Try to infer prefecture from context
            pass
        
        return address
    
    def batch_geocode(self, addresses: List[str]) -> List[Dict]:
        """Geocode multiple addresses efficiently"""
        results = []
        for address in addresses:
            result = self.geocode_address(address)
            results.append({
                'address': address,
                'geocoded': result
            })
        return results

# Flask API endpoints for the mobile app
app = Flask(__name__)
geocoder = JapaneseGeocodingService()

@app.route('/api/geocode', methods=['POST'])
def api_geocode():
    """Geocode Japanese address to coordinates"""
    data = request.get_json()
    address = data.get('address', '').strip()
    
    if not address:
        return jsonify({'error': 'Address is required'}), 400
    
    result = geocoder.geocode_address(address)
    
    if result:
        return jsonify({
            'success': True,
            'result': result
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Address not found'
        }), 404

@app.route('/api/reverse-geocode', methods=['POST'])
def api_reverse_geocode():
    """Reverse geocode coordinates to Japanese address"""
    data = request.get_json()
    lat = data.get('latitude')
    lng = data.get('longitude')
    
    if lat is None or lng is None:
        return jsonify({'error': 'Latitude and longitude required'}), 400
    
    result = geocoder.reverse_geocode(float(lat), float(lng))
    
    if result:
        return jsonify({
            'success': True,
            'result': result
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Location not found'
        }), 404

@app.route('/api/calculate-fare', methods=['POST'])
def api_calculate_fare():
    """Calculate realistic fare based on actual distance"""
    data = request.get_json()
    
    station_name = data.get('station')
    destination_address = data.get('destination')
    
    if not station_name or not destination_address:
        return jsonify({'error': 'Station and destination required'}), 400
    
    try:
        # Get station coordinates from your station database
        # This would query your all_japan_stations.json data
        station_coords = get_station_coordinates(station_name)
        
        if not station_coords:
            return jsonify({'error': 'Station not found'}), 404
        
        # Calculate real distance
        distance_km = geocoder.calculate_distance(station_coords, destination_address)
        
        if distance_km is None:
            return jsonify({'error': 'Could not calculate distance'}), 400
        
        # Calculate realistic fare based on actual distance
        fare = calculate_realistic_fare(distance_km)
        
        return jsonify({
            'success': True,
            'distance_km': round(distance_km, 1),
            'base_fare': fare['base'],
            'total_fare': fare['total'],
            'breakdown': fare['breakdown']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_station_coordinates(station_name: str) -> Optional[Tuple[float, float]]:
    """Get station coordinates from your station database"""
    # Load your station data
    try:
        import json
        with open('data/all_japan_stations.json', 'r', encoding='utf-8') as f:
            stations = json.load(f)
        
        for station in stations:
            if station.get('name') == station_name:
                lat = station.get('lat') or station.get('latitude')
                lng = station.get('lng') or station.get('longitude')
                if lat and lng:
                    return (float(lat), float(lng))
        
        return None
    except Exception as e:
        print(f"Error loading station coordinates: {e}")
        return None

def calculate_realistic_fare(distance_km: float) -> Dict:
    """Calculate realistic taxi fare based on actual distance"""
    # Tokyo taxi fare structure
    base_fare = 500  # First 1.096km
    distance_fare_rate = 100  # Per 255m after base
    time_fare_rate = 40  # Per 90 seconds in traffic
    
    fare_breakdown = {
        'base': base_fare,
        'distance': 0,
        'time': 0,
        'night_surcharge': 0,
        'weather_surcharge': 0
    }
    
    total_fare = base_fare
    
    # Distance fare
    if distance_km > 1.096:
        additional_distance = distance_km - 1.096
        distance_units = additional_distance / 0.255
        distance_fare = int(distance_units) * distance_fare_rate
        fare_breakdown['distance'] = distance_fare
        total_fare += distance_fare
    
    # Time-based fare (traffic estimation)
    estimated_time_minutes = distance_km * 3  # 3 min per km in urban areas
    time_units = estimated_time_minutes / 1.5  # 90-second intervals
    time_fare = int(time_units) * time_fare_rate
    fare_breakdown['time'] = time_fare
    total_fare += time_fare
    
    # Night surcharge (22:00-05:00)
    import datetime
    current_hour = datetime.datetime.now().hour
    if current_hour >= 22 or current_hour < 5:
        night_surcharge = int(total_fare * 0.2)
        fare_breakdown['night_surcharge'] = night_surcharge
        total_fare += night_surcharge
    
    # Round to nearest 10 yen
    total_fare = round(total_fare / 10) * 10
    
    return {
        'base': base_fare,
        'total': total_fare,
        'breakdown': fare_breakdown
    }

if __name__ == '__main__':
    app.run(debug=True, port=5001)
