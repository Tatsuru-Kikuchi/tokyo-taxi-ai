// backend/services/MapboxService.js
// Complete Mapbox integration for accurate geocoding and distance calculation

class MapboxService {
  constructor() {
    // Get your Mapbox token from: https://account.mapbox.com/
    this.accessToken = process.env.MAPBOX_ACCESS_TOKEN || 'your_mapbox_token_here';
    this.baseUrl = 'https://api.mapbox.com';
    this.cache = new Map();
  }

  /**
   * Geocode Japanese address to coordinates
   * @param {string} address - Japanese address
   * @returns {Promise<Object>} Geocoded result
   */
  async geocodeAddress(address) {
    if (!address || !address.trim()) {
      return null;
    }

    const cleanAddress = address.trim();
    
    // Check cache first
    if (this.cache.has(cleanAddress)) {
      return this.cache.get(cleanAddress);
    }

    try {
      // Mapbox Geocoding API with Japanese language support
      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(cleanAddress)}.json`;
      const params = new URLSearchParams({
        access_token: this.accessToken,
        country: 'JP', // Limit to Japan
        language: 'ja', // Japanese language
        limit: 1,
        types: 'address,poi' // Address and points of interest
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;

        const result = {
          latitude: latitude,
          longitude: longitude,
          formatted_address: feature.place_name,
          confidence: feature.relevance || 0.8,
          source: 'mapbox',
          place_type: feature.place_type?.[0] || 'address',
          context: feature.context || []
        };

        // Cache the result
        this.cache.set(cleanAddress, result);
        return result;
      }

      return null;
    } catch (error) {
      console.log('Mapbox geocoding error:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to Japanese address
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Promise<Object>} Address information
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${longitude},${latitude}.json`;
      const params = new URLSearchParams({
        access_token: this.accessToken,
        language: 'ja',
        types: 'address'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        
        return {
          address: feature.place_name,
          latitude: latitude,
          longitude: longitude,
          place_type: feature.place_type?.[0] || 'address',
          context: feature.context || []
        };
      }

      return null;
    } catch (error) {
      console.log('Mapbox reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Calculate actual driving distance and time between two points
   * @param {Array} startCoords - [longitude, latitude]
   * @param {Array} endCoords - [longitude, latitude] 
   * @returns {Promise<Object>} Route information
   */
  async calculateRoute(startCoords, endCoords) {
    try {
      const coordinates = `${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}`;
      const url = `${this.baseUrl}/directions/v5/mapbox/driving/${coordinates}`;
      
      const params = new URLSearchParams({
        access_token: this.accessToken,
        geometries: 'geojson',
        overview: 'simplified',
        steps: false,
        language: 'ja'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        return {
          distance_km: (route.distance / 1000), // Convert meters to km
          duration_minutes: (route.duration / 60), // Convert seconds to minutes
          geometry: route.geometry,
          source: 'mapbox_directions'
        };
      }

      return null;
    } catch (error) {
      console.log('Mapbox routing error:', error);
      return null;
    }
  }

  /**
   * Calculate taxi fare using real Mapbox distance
   * @param {string} stationName - Pickup station
   * @param {string} destinationAddress - Destination address
   * @returns {Promise<Object>} Detailed fare calculation
   */
  async calculateTaxiFare(stationName, destinationAddress) {
    try {
      // Get station coordinates (from your station database)
      const stationCoords = await this.getStationCoordinates(stationName);
      if (!stationCoords) {
        throw new Error('Station not found');
      }

      // Geocode destination
      const destInfo = await this.geocodeAddress(destinationAddress);
      if (!destInfo) {
        throw new Error('Destination not found');
      }

      // Calculate actual route
      const route = await this.calculateRoute(
        [stationCoords.longitude, stationCoords.latitude],
        [destInfo.longitude, destInfo.latitude]
      );

      if (!route) {
        throw new Error('Route calculation failed');
      }

      // Calculate fare based on real distance
      const fareDetails = this.calculateJapaneseTaxiFare(route.distance_km, route.duration_minutes);

      return {
        success: true,
        route: {
          distance_km: Math.round(route.distance_km * 10) / 10,
          duration_minutes: Math.round(route.duration_minutes),
          geometry: route.geometry
        },
        fare: fareDetails,
        pickup: {
          name: stationName,
          coordinates: stationCoords
        },
        destination: {
          address: destInfo.formatted_address,
          coordinates: {
            latitude: destInfo.latitude,
            longitude: destInfo.longitude
          }
        }
      };

    } catch (error) {
      console.log('Taxi fare calculation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate Japanese taxi fare based on distance and time
   * @param {number} distanceKm - Distance in kilometers
   * @param {number} durationMinutes - Duration in minutes
   * @returns {Object} Detailed fare breakdown
   */
  calculateJapaneseTaxiFare(distanceKm, durationMinutes) {
    // Japanese taxi fare structure (Tokyo standard)
    const baseFare = 500;      // First 1.096km
    const baseDistance = 1.096;
    const farePerUnit = 100;   // Per 255m
    const unitDistance = 0.255;
    const timeFare = 40;       // Per 90 seconds when speed < 10km/h
    const timeInterval = 1.5;  // 90 seconds

    const breakdown = {
      base: baseFare,
      distance: 0,
      time: 0,
      nightSurcharge: 0,
      total: baseFare
    };

    // Distance fare
    if (distanceKm > baseDistance) {
      const additionalDistance = distanceKm - baseDistance;
      const units = Math.ceil(additionalDistance / unitDistance);
      breakdown.distance = units * farePerUnit;
    }

    // Time fare (estimate based on traffic)
    const trafficTimeMinutes = Math.max(0, durationMinutes - (distanceKm * 2)); // Assume 30km/h average, slower is traffic
    const timeUnits = Math.floor(trafficTimeMinutes / timeInterval);
    breakdown.time = timeUnits * timeFare;

    // Night surcharge (22:00-05:00, 20% extra)
    const currentHour = new Date().getHours();
    if (currentHour >= 22 || currentHour < 5) {
      const beforeSurcharge = breakdown.base + breakdown.distance + breakdown.time;
      breakdown.nightSurcharge = Math.floor(beforeSurcharge * 0.2);
    }

    // Calculate total
    breakdown.total = breakdown.base + breakdown.distance + breakdown.time + breakdown.nightSurcharge;
    
    // Round to nearest 10 yen
    breakdown.total = Math.round(breakdown.total / 10) * 10;
    breakdown.total = Math.max(breakdown.total, 500); // Minimum fare

    return {
      amount: breakdown.total,
      breakdown: breakdown,
      currency: 'JPY',
      distance_km: distanceKm,
      duration_minutes: durationMinutes
    };
  }

  /**
   * Get station coordinates from your database
   * @param {string} stationName 
   * @returns {Promise<Object>} Station coordinates
   */
  async getStationCoordinates(stationName) {
    try {
      // Load your station data (you'd replace this with your actual data loading)
      const fs = require('fs');
      const stationsData = JSON.parse(fs.readFileSync('../data/all_japan_stations.json', 'utf8'));
      
      const station = stationsData.find(s => s.name === stationName);
      if (station) {
        return {
          latitude: parseFloat(station.lat || station.latitude),
          longitude: parseFloat(station.lng || station.longitude || station.lon),
          name: station.name,
          prefecture: station.prefecture
        };
      }

      return null;
    } catch (error) {
      console.log('Station lookup error:', error);
      return null;
    }
  }

  /**
   * Get address suggestions for autocomplete
   * @param {string} query - Partial address
   * @returns {Promise<Array>} Address suggestions
   */
  async getAddressSuggestions(query) {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
      const params = new URLSearchParams({
        access_token: this.accessToken,
        country: 'JP',
        language: 'ja',
        limit: 5,
        types: 'address,poi'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.features) {
        return data.features.map(feature => ({
          address: feature.place_name,
          coordinates: {
            latitude: feature.center[1],
            longitude: feature.center[0]
          },
          place_type: feature.place_type?.[0] || 'address',
          relevance: feature.relevance || 0
        }));
      }

      return [];
    } catch (error) {
      console.log('Address suggestions error:', error);
      return [];
    }
  }
}

// Express.js routes for the mobile app
const express = require('express');
const router = express.Router();

const mapboxService = new MapboxService();

// Geocode address
router.post('/api/mapbox/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const result = await mapboxService.geocodeAddress(address);
    
    if (result) {
      res.json({ success: true, result });
    } else {
      res.status(404).json({ success: false, error: 'Address not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Calculate taxi fare with real distance
router.post('/api/mapbox/calculate-fare', async (req, res) => {
  try {
    const { station, destination } = req.body;
    
    if (!station || !destination) {
      return res.status(400).json({ error: 'Station and destination required' });
    }

    const result = await mapboxService.calculateTaxiFare(station, destination);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get address suggestions
router.get('/api/mapbox/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.json([]);
    }

    const suggestions = await mapboxService.getAddressSuggestions(q);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mobile app integration service
// mobile-app/services/MapboxService.js

class MobileMapboxService {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
    this.cache = new Map();
  }

  async calculateRealisticFare(stationName, destinationAddress) {
    try {
      const response = await fetch(`${this.backendUrl}/api/mapbox/calculate-fare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          station: stationName,
          destination: destinationAddress,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        return {
          distance: data.route.distance_km,
          duration: data.route.duration_minutes,
          fare: data.fare.amount,
          breakdown: data.fare.breakdown,
          route: data.route,
          isRealDistance: true,
          source: 'mapbox'
        };
      }

      return null;
    } catch (error) {
      console.log('Mapbox fare calculation error:', error);
      return null;
    }
  }

  async getAddressSuggestions(query) {
    if (!query || query.length < 2) return [];

    try {
      const response = await fetch(
        `${this.backendUrl}/api/mapbox/suggestions?q=${encodeURIComponent(query)}`
      );

      if (response.ok) {
        return await response.json();
      }

      return [];
    } catch (error) {
      console.log('Address suggestions error:', error);
      return [];
    }
  }
}

// Usage in your CustomerScreen.js
const mapboxService = new MobileMapboxService(backendUrl);

// Replace your fare calculation with:
const calculateMapboxFare = async () => {
  if (!selectedStation || !destination) return;

  setIsCalculatingFare(true);

  try {
    const fareData = await mapboxService.calculateRealisticFare(
      selectedStation.name,
      destination
    );

    if (fareData) {
      setFare({
        amount: fareData.fare,
        distance: fareData.distance,
        duration: fareData.duration,
        breakdown: fareData.breakdown,
        goSavings: Math.round(fareData.fare * 0.15),
        isRealDistance: true
      });
    } else {
      // Fallback to your existing estimation
      calculateFallbackFare();
    }
  } catch (error) {
    console.log('Fare calculation failed:', error);
    calculateFallbackFare();
  } finally {
    setIsCalculatingFare(false);
  }
};

module.exports = { MapboxService, router };
