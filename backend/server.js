const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let firestore;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase initialized with environment variable');
  } else {
    console.log('⚠️ Firebase service account not found in environment');
  }
  firestore = admin.firestore();
  console.log('✅ Firestore connected');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
}

// Import station data - FIXED IMPORT
const {
  ALL_JAPAN_STATIONS,
  REGIONS,
  getStationsByRegion,
  getRegionByCoordinates,
  getNearbyStations
} = require('./japan-stations');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// In-memory storage (for development)
let users = [];
let drivers = [];
let rides = [];
let rideRequests = [];

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('📱 Client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received:', data);

      switch (data.type) {
        case 'driver_online':
          const driver = {
            id: data.driverId,
            name: data.driverName,
            location: data.location,
            isOnline: true,
            ws: ws
          };
          drivers = drivers.filter(d => d.id !== data.driverId);
          drivers.push(driver);
          console.log(`🚕 Driver ${data.driverName} is online`);
          break;

        case 'driver_offline':
          drivers = drivers.filter(d => d.id !== data.driverId);
          console.log(`🚕 Driver ${data.driverId} went offline`);
          break;

        case 'location_update':
          const driverIndex = drivers.findIndex(d => d.id === data.driverId);
          if (driverIndex !== -1) {
            drivers[driverIndex].location = data.location;
          }
          break;
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('📱 Client disconnected');
    drivers = drivers.filter(d => d.ws !== ws);
  });
});

// OpenWeather API Configuration
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'bd17578f85cb46d681ca3e4f3bdc9963';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Region coordinates for weather lookup
const REGION_COORDINATES = {
  tokyo: { lat: 35.6762, lon: 139.6503 },
  osaka: { lat: 34.6937, lon: 135.5023 },
  nagoya: { lat: 35.1815, lon: 136.9066 },
  kyoto: { lat: 35.0116, lon: 135.7681 },
  fukuoka: { lat: 33.5904, lon: 130.4017 },
  sapporo: { lat: 43.0642, lon: 141.3469 },
  sendai: { lat: 38.2682, lon: 140.8694 },
  hiroshima: { lat: 34.3853, lon: 132.4553 }
};

// Helper Functions
const getWeatherForecast = async (region = 'tokyo') => {
  try {
    // Get coordinates for the region
    const coords = REGION_COORDINATES[region] || REGION_COORDINATES.tokyo;

    if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'your_api_key_here') {
      console.log('⚠️ Using mock weather data - OpenWeather API key not configured');
      return getMockWeatherData();
    }

    // Current weather
    const currentResponse = await fetch(
      `${OPENWEATHER_BASE_URL}/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ja`
    );

    // Forecast weather
    const forecastResponse = await fetch(
      `${OPENWEATHER_BASE_URL}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ja`
    );

    if (!currentResponse.ok || !forecastResponse.ok) {
      console.log('⚠️ Weather API error, using mock data');
      return getMockWeatherData();
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    // Convert OpenWeather condition to our format
    const convertCondition = (weather) => {
      const main = weather.main.toLowerCase();
      if (main.includes('rain')) return 'rainy';
      if (main.includes('cloud')) return 'cloudy';
      if (main.includes('clear')) return 'sunny';
      return 'partly_cloudy';
    };

    return {
      current: {
        condition: convertCondition(currentData.weather[0]),
        temperature: Math.round(currentData.main.temp),
        humidity: currentData.main.humidity,
        windSpeed: Math.round(currentData.wind?.speed || 0),
        description: currentData.weather[0].description,
        city: currentData.name
      },
      forecast: forecastData.list.slice(0, 24).map(item => ({
        hour: new Date(item.dt * 1000).getHours(),
        condition: convertCondition(item.weather[0]),
        temperature: Math.round(item.main.temp),
        rainProbability: Math.round((item.pop || 0) * 100),
        description: item.weather[0].description
      }))
    };

  } catch (error) {
    console.error('❌ Weather API error:', error.message);
    return getMockWeatherData();
  }
};

// Fallback mock weather data
const getMockWeatherData = () => {
  const weatherConditions = ['sunny', 'cloudy', 'rainy', 'partly_cloudy'];
  const temperatures = [15, 18, 22, 25, 28, 30];

  return {
    current: {
      condition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
      temperature: temperatures[Math.floor(Math.random() * temperatures.length)],
      humidity: Math.floor(Math.random() * 40) + 40,
      windSpeed: Math.floor(Math.random() * 15) + 5,
      description: 'Mock weather data',
      city: 'Mock City'
    },
    forecast: Array.from({ length: 24 }, (_, i) => ({
      hour: (new Date().getHours() + i) % 24,
      condition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
      temperature: temperatures[Math.floor(Math.random() * temperatures.length)],
      rainProbability: Math.floor(Math.random() * 100),
      description: 'Mock forecast'
    }))
  };
};

const calculateDemandLevel = (stationId, hour, weatherCondition) => {
  const station = ALL_JAPAN_STATIONS.find(s => s.id === stationId);
  if (!station) return 'low';

  let demandScore = 0;

  // Base demand level
  const demandLevels = {
    'very_high': 4,
    'high': 3,
    'medium': 2,
    'low': 1
  };
  demandScore += demandLevels[station.demandLevel] || 1;

  // Peak hours bonus
  if (station.peakHours.includes(hour)) {
    demandScore += 2;
  }

  // Weather impact
  if (weatherCondition === 'rainy' && station.weatherSensitive) {
    demandScore += 2;
  }

  // Category bonus
  if (station.category === 'major_hub') demandScore += 1;
  if (station.category === 'airport') demandScore += 3;

  if (demandScore >= 6) return 'very_high';
  if (demandScore >= 4) return 'high';
  if (demandScore >= 2) return 'medium';
  return 'low';
};

const generateAIRecommendations = async (lat, lon, hour, weather) => {
  const region = getRegionByCoordinates(lat, lon);
  const regionData = REGIONS[region];
  const nearbyStations = getNearbyStations(lat, lon, 0.05);

  const recommendations = [];

  // Weather-based recommendations
  if (weather.current.condition === 'rainy') {
    const rainStations = nearbyStations.filter(s => s.weatherSensitive);
    if (rainStations.length > 0) {
      recommendations.push({
        type: 'weather',
        message: `雨のため${rainStations[0].name}周辺の需要が増加中`,
        priority: 'high',
        stations: rainStations.slice(0, 2).map(s => s.id)
      });
    }
  }

  // Peak hour recommendations
  const peakStations = nearbyStations.filter(s => s.peakHours.includes(hour));
  if (peakStations.length > 0) {
    recommendations.push({
      type: 'peak_hours',
      message: `${hour}:00の需要ピークに備えて${peakStations[0].name}エリアへ`,
      priority: 'medium',
      stations: peakStations.slice(0, 2).map(s => s.id)
    });
  }

  // High-demand area recommendations
  const highDemandStations = nearbyStations.filter(s =>
    calculateDemandLevel(s.id, hour, weather.current.condition) === 'very_high'
  );

  if (highDemandStations.length > 0) {
    recommendations.push({
      type: 'high_demand',
      message: `${highDemandStations[0].name}は現在高需要エリアです`,
      priority: 'high',
      stations: highDemandStations.slice(0, 3).map(s => s.id)
    });
  }

  return {
    region: regionData?.name || '未対応地域',
    prefecture: regionData?.name || '未対応',
    recommendations: recommendations.slice(0, 3),
    coverage: 'nationwide'
  };
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    coverage: 'nationwide',
    supportedRegions: Object.keys(REGIONS).length,
    totalStations: ALL_JAPAN_STATIONS.length,
    firebase: firestore ? 'connected' : 'disconnected'
  });
});

// Get all stations with optional filtering
app.get('/api/stations', (req, res) => {
  try {
    const { region, category, limit } = req.query;
    let stations = ALL_JAPAN_STATIONS;

    if (region) {
      stations = getStationsByRegion(region);
    }

    if (category) {
      stations = stations.filter(s => s.category === category);
    }

    if (limit) {
      stations = stations.slice(0, parseInt(limit));
    }

    res.json({
      stations,
      total: stations.length,
      regions: Object.keys(REGIONS)
    });
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// Get stations by region
app.get('/api/stations/region/:region', (req, res) => {
  try {
    const { region } = req.params;
    const stations = getStationsByRegion(region);
    const regionData = REGIONS[region];

    if (!regionData) {
      return res.status(404).json({ error: 'Region not found' });
    }

    res.json({
      region: regionData.name,
      regionKey: region,
      stations,
      total: stations.length
    });
  } catch (error) {
    console.error('Error fetching region stations:', error);
    res.status(500).json({ error: 'Failed to fetch region stations' });
  }
});

// Get nearby stations with regional support
app.get('/api/stations/nearby-regional', (req, res) => {
  try {
    const { lat, lon, radius = 0.1 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const searchRadius = parseFloat(radius);

    const detectedRegion = getRegionByCoordinates(latitude, longitude);
    const regionData = REGIONS[detectedRegion];
    const nearbyStations = getNearbyStations(latitude, longitude, searchRadius);

    res.json({
      detectedRegion,
      prefecture: regionData?.name || '未対応地域',
      coordinates: { lat: latitude, lon: longitude },
      radius: searchRadius,
      stations: nearbyStations,
      total: nearbyStations.length
    });
  } catch (error) {
    console.error('Error fetching nearby stations:', error);
    res.status(500).json({ error: 'Failed to fetch nearby stations' });
  }
});

// Get high-demand stations for current time
app.get('/api/stations/high-demand', async (req, res) => {
  try {
    const { hour, region } = req.query;
    const currentHour = hour ? parseInt(hour) : new Date().getHours();
    const weather = await getWeatherForecast(region || 'tokyo');

    let stations = ALL_JAPAN_STATIONS;
    if (region) {
      stations = getStationsByRegion(region);
    }

    const highDemandStations = stations
      .map(station => ({
        ...station,
        currentDemand: calculateDemandLevel(station.id, currentHour, weather.current.condition),
        isPeakHour: station.peakHours.includes(currentHour)
      }))
      .filter(station =>
        station.currentDemand === 'very_high' || station.currentDemand === 'high'
      )
      .sort((a, b) => {
        const demandOrder = { 'very_high': 2, 'high': 1 };
        return demandOrder[b.currentDemand] - demandOrder[a.currentDemand];
      });

    res.json({
      hour: currentHour,
      region: region || 'all',
      weather: weather.current,
      stations: highDemandStations,
      total: highDemandStations.length
    });
  } catch (error) {
    console.error('Error fetching high-demand stations:', error);
    res.status(500).json({ error: 'Failed to fetch high-demand stations' });
  }
});

// Get regional weather forecast
app.get('/api/weather/forecast-regional', async (req, res) => {
  try {
    const { region = 'tokyo' } = req.query;
    const regionData = REGIONS[region];

    if (!regionData) {
      return res.status(404).json({ error: 'Region not supported' });
    }

    const weather = await getWeatherForecast(region);

    res.json({
      region: regionData.name,
      location: regionData.nameEn,
      weather,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// Get AI recommendations with regional support
app.get('/api/recommendations/regional', async (req, res) => {
  try {
    const { lat, lon, hour } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const currentHour = hour ? parseInt(hour) : new Date().getHours();

    const region = getRegionByCoordinates(latitude, longitude);
    const weather = await getWeatherForecast(region);
    const recommendations = await generateAIRecommendations(latitude, longitude, currentHour, weather);

    res.json({
      location: { lat: latitude, lon: longitude },
      hour: currentHour,
      weather: weather.current,
      ...recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// User management
app.post('/api/users', async (req, res) => {
  try {
    const { name, phone, role, location } = req.body;

    if (!name || !phone || !role) {
      return res.status(400).json({ error: 'Name, phone, and role are required' });
    }

    const user = {
      id: Date.now().toString(),
      name,
      phone,
      role,
      location: location || null,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    users.push(user);

    // Save to Firestore if available
    if (firestore) {
      try {
        await firestore.collection('users').doc(user.id).set(user);
        console.log('✅ User saved to Firestore');
      } catch (firestoreError) {
        console.error('❌ Firestore save error:', firestoreError);
      }
    }

    console.log(`👤 New ${role} registered: ${name}`);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Driver management
app.get('/api/drivers/online', (req, res) => {
  try {
    const { region } = req.query;
    let onlineDrivers = drivers.filter(d => d.isOnline);

    if (region) {
      onlineDrivers = onlineDrivers.filter(d => {
        if (!d.location) return false;
        const driverRegion = getRegionByCoordinates(d.location.latitude, d.location.longitude);
        return driverRegion === region;
      });
    }

    // Remove WebSocket references for JSON response
    const driversData = onlineDrivers.map(d => ({
      id: d.id,
      name: d.name,
      location: d.location,
      isOnline: d.isOnline
    }));

    res.json({
      drivers: driversData,
      total: driversData.length,
      region: region || 'all'
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Ride management
app.post('/api/rides/request', async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      pickup,
      destination,
      pickupStation,
      destinationStation
    } = req.body;

    if (!customerId || !pickup || !destination) {
      return res.status(400).json({ error: 'Customer ID, pickup, and destination are required' });
    }

    // Find nearby drivers
    const region = getRegionByCoordinates(pickup.latitude, pickup.longitude);
    const nearbyDrivers = drivers.filter(driver => {
      if (!driver.isOnline || !driver.location) return false;

      const distance = Math.sqrt(
        Math.pow(pickup.latitude - driver.location.latitude, 2) +
        Math.pow(pickup.longitude - driver.location.longitude, 2)
      );

      return distance <= 0.1; // Within ~10km radius
    });

    const ride = {
      id: Date.now().toString(),
      customerId,
      customerName,
      pickup,
      destination,
      pickupStation: pickupStation || null,
      destinationStation: destinationStation || null,
      region,
      status: 'requested',
      fare: Math.floor(Math.random() * 2000) + 500, // Mock fare calculation
      requestedAt: new Date().toISOString(),
      availableDrivers: nearbyDrivers.length
    };

    rideRequests.push(ride);

    // Notify nearby drivers
    nearbyDrivers.forEach(driver => {
      if (driver.ws && driver.ws.readyState === 1) {
        driver.ws.send(JSON.stringify({
          type: 'ride_request',
          ride: {
            id: ride.id,
            customerName: ride.customerName,
            pickup: ride.pickup,
            destination: ride.destination,
            pickupStation: ride.pickupStation,
            destinationStation: ride.destinationStation,
            fare: ride.fare
          }
        }));
      }
    });

    // Save to Firestore if available
    if (firestore) {
      try {
        await firestore.collection('rides').doc(ride.id).set(ride);
        console.log('✅ Ride saved to Firestore');
      } catch (firestoreError) {
        console.error('❌ Firestore save error:', firestoreError);
      }
    }

    console.log(`🚕 New ride request: ${customerName} (${nearbyDrivers.length} drivers notified)`);
    res.json({ success: true, ride, availableDrivers: nearbyDrivers.length });
  } catch (error) {
    console.error('Error creating ride request:', error);
    res.status(500).json({ error: 'Failed to create ride request' });
  }
});

// Get ride requests
app.get('/api/rides/requests', (req, res) => {
  try {
    const { status, region } = req.query;
    let filteredRequests = rideRequests;

    if (status) {
      filteredRequests = filteredRequests.filter(r => r.status === status);
    }

    if (region) {
      filteredRequests = filteredRequests.filter(r => r.region === region);
    }

    res.json({
      requests: filteredRequests,
      total: filteredRequests.length
    });
  } catch (error) {
    console.error('Error fetching ride requests:', error);
    res.status(500).json({ error: 'Failed to fetch ride requests' });
  }
});

// Analytics endpoint
app.get('/api/analytics', (req, res) => {
  try {
    const { region } = req.query;

    let filteredUsers = users;
    let filteredRides = rides;
    let filteredDrivers = drivers;

    if (region) {
      filteredRides = rides.filter(r => r.region === region);
      // Filter drivers and users by region would need location data
    }

    const analytics = {
      users: {
        total: filteredUsers.length,
        drivers: filteredUsers.filter(u => u.role === 'driver').length,
        customers: filteredUsers.filter(u => u.role === 'customer').length
      },
      rides: {
        total: filteredRides.length,
        completed: filteredRides.filter(r => r.status === 'completed').length,
        active: filteredRides.filter(r => r.status === 'active').length,
        requested: rideRequests.length
      },
      drivers: {
        total: filteredDrivers.length,
        online: filteredDrivers.filter(d => d.isOnline).length,
        offline: filteredDrivers.filter(d => !d.isOnline).length
      },
      coverage: {
        regions: Object.keys(REGIONS).length,
        stations: ALL_JAPAN_STATIONS.length
      },
      region: region || 'all',
      timestamp: new Date().toISOString()
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚕 全国AIタクシー Backend running on port ${PORT}`);
  console.log('📡 WebSocket ready for connections');
  console.log('🔥 Firebase:', firestore ? 'connected' : 'disconnected');
  console.log('🌦️ Weather API: Configured');
  console.log(`🗾 Coverage: Nationwide Japan (${Object.keys(REGIONS).length} regions)`);
  console.log(`🚇 Total Stations: ${ALL_JAPAN_STATIONS.length}`);
  console.log('🎯 Ready for Nagoya testing!');
});
