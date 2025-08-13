// Enhanced server.js for Nationwide Japan Support
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios');

// Import Japan-wide station data
const {
  JAPAN_STATIONS,
  PREFECTURE_REGIONS,
  WEATHER_LOCATIONS,
  detectRegion,
  getStationsForRegion,
  getWeatherLocationForRegion,
  getNationwideAIRecommendations,
  getNearbyStations
} = require('./japan-stations');

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase initialized with environment variable');
  } catch (error) {
    console.error('Failed to parse Firebase service account:', error);
  }
} else {
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase initialized with local file');
  } catch (error) {
    console.log('⚠️ serviceAccountKey.json not found - running without Firebase');
  }
}

let db = null;
if (admin.apps.length > 0) {
  db = admin.firestore();
  console.log('✅ Firestore connected');
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'bd17578f85cb46d681ca3e4f3bdc9963';

// REST API Routes
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: '全国AIタクシー Backend API',
    version: '3.0.0',
    coverage: 'Nationwide Japan',
    regions: Object.keys(JAPAN_STATIONS),
    endpoints: ['/api/health', '/api/weather/forecast', '/api/stations', '/api/recommendations']
  });
});

app.get('/api/health', (req, res) => {
  const totalStations = Object.values(JAPAN_STATIONS)
    .reduce((total, region) => {
      return total + Object.values(region).flat().length;
    }, 0);

  res.json({
    status: 'OK',
    message: '全国AIタクシー Backend Running',
    firebase: admin.apps.length > 0 ? 'connected' : 'not connected',
    timestamp: new Date().toISOString(),
    connectedDrivers: connectedDrivers.size,
    connectedCustomers: connectedCustomers.size,
    totalStations: totalStations,
    supportedRegions: Object.keys(JAPAN_STATIONS).length
  });
});

// Regional weather forecast
app.get('/api/weather/forecast-regional', async (req, res) => {
  const { lat, lon, region } = req.query;

  let weatherLocation;
  if (lat && lon) {
    const userLocation = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    const detectedRegion = detectRegion(userLocation);
    weatherLocation = getWeatherLocationForRegion(detectedRegion);
  } else if (region) {
    weatherLocation = getWeatherLocationForRegion(region);
  } else {
    weatherLocation = WEATHER_LOCATIONS.tokyo; // Default
  }

  try {
    if (WEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
      return res.status(400).json({
        error: 'Weather API key not configured',
        message: 'Please add your OpenWeatherMap API key'
      });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${weatherLocation.lat}&lon=${weatherLocation.lon}&appid=${WEATHER_API_KEY}&units=metric`
    );

    const forecasts = response.data.list.slice(0, 8).map(item => ({
      time: new Date(item.dt * 1000).toLocaleTimeString('ja-JP'),
      temp: Math.round(item.main.temp),
      description: item.weather[0].description,
      rain: item.rain ? item.rain['3h'] || 0 : 0,
      humidity: item.main.humidity,
      windSpeed: item.wind.speed
    }));

    const rainComing = forecasts.slice(0, 1).some(f => f.rain > 0);

    // Get regional stations for recommendations
    const userRegion = detectRegion({ latitude: weatherLocation.lat, longitude: weatherLocation.lon });
    const regionalStations = getStationsForRegion(userRegion);
    const allStations = Object.values(regionalStations).flat();

    const recommendedStations = rainComing
      ? allStations.filter(s => s.weatherSensitive).slice(0, 5)
      : allStations.filter(s => s.demandLevel === 'very_high').slice(0, 5);

    res.json({
      region: userRegion,
      location: weatherLocation.name,
      current: {
        temp: forecasts[0].temp,
        description: forecasts[0].description,
        humidity: forecasts[0].humidity
      },
      forecasts,
      rainAlert: rainComing,
      message: rainComing
        ? `${weatherLocation.name}で雨が予想されます。駅周辺の需要が高まります。`
        : `${weatherLocation.name}で晴天が続く予報です。`,
      recommendedStations: recommendedStations
    });

  } catch (error) {
    console.error('Weather API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Get stations by region
app.get('/api/stations/region/:region', (req, res) => {
  const { region } = req.params;
  const { demandLevel, category } = req.query;

  let stations = getStationsForRegion(region);
  let allStations = Object.values(stations).flat();

  // Apply filters
  if (demandLevel) {
    allStations = allStations.filter(s => s.demandLevel === demandLevel);
  }

  if (category) {
    allStations = allStations.filter(s => s.category === category);
  }

  res.json({
    region,
    prefecture: PREFECTURE_REGIONS[region]?.name || region,
    count: allStations.length,
    stations: allStations
  });
});

// Detect user's region and get nearby stations
app.get('/api/stations/nearby-regional', (req, res) => {
  const { lat, lon, radius = 2 } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Location coordinates required' });
  }

  const userLocation = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
  const region = detectRegion(userLocation);
  const regionalStations = getStationsForRegion(region);
  const allStations = Object.values(regionalStations).flat();

  const nearby = getNearbyStations(userLocation, parseFloat(radius), allStations);

  res.json({
    location: userLocation,
    detectedRegion: region,
    prefecture: PREFECTURE_REGIONS[region]?.name || region,
    radius: parseFloat(radius),
    stations: nearby
  });
});

// Regional AI recommendations
app.get('/api/recommendations/regional', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Location coordinates required' });
  }

  const driverLocation = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
  const region = detectRegion(driverLocation);
  const currentHour = new Date().getHours();

  // Get regional weather
  const weatherLocation = getWeatherLocationForRegion(region);
  let weatherCondition = { rain: 0 };

  try {
    if (WEATHER_API_KEY !== 'YOUR_API_KEY_HERE') {
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${weatherLocation.lat}&lon=${weatherLocation.lon}&appid=${WEATHER_API_KEY}&units=metric`
      );
      weatherCondition = {
        rain: weatherResponse.data.rain ? weatherResponse.data.rain['1h'] || 0 : 0,
        description: weatherResponse.data.weather[0].description
      };
    }
  } catch (error) {
    console.error('Weather API error:', error);
  }

  const recommendations = getNationwideAIRecommendations(driverLocation, currentHour, weatherCondition);

  res.json({
    recommendations,
    currentConditions: {
      region,
      prefecture: PREFECTURE_REGIONS[region]?.name || region,
      hour: currentHour,
      weather: weatherCondition
    },
    timestamp: new Date().toISOString()
  });
});

// Get all supported regions
app.get('/api/regions', (req, res) => {
  const regions = Object.keys(JAPAN_STATIONS).map(regionKey => ({
    key: regionKey,
    name: PREFECTURE_REGIONS[regionKey]?.name || regionKey,
    stationCount: Object.values(JAPAN_STATIONS[regionKey]).flat().length,
    weatherSupported: !!WEATHER_LOCATIONS[regionKey]
  }));

  res.json({
    totalRegions: regions.length,
    regions
  });
});

// WebSocket handling with regional support
const connectedDrivers = new Map();
const connectedCustomers = new Map();
const activeRides = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Driver connects with regional detection
  socket.on('driver:connect', async (driverData) => {
    console.log('Driver connected:', driverData);

    const region = driverData.location ? detectRegion(driverData.location) : 'unknown';

    const driverInfo = {
      ...driverData,
      socketId: socket.id,
      status: 'online',
      location: driverData.location || null,
      region: region,
      prefecture: PREFECTURE_REGIONS[region]?.name || region,
      lastSeen: new Date()
    };

    connectedDrivers.set(socket.id, driverInfo);

    // Update Firebase with regional info
    if (db && driverData.driverId) {
      try {
        await db.collection('drivers').doc(driverData.driverId).set({
          ...driverInfo,
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Error updating driver status:', error);
      }
    }

    // Send regional AI recommendations
    if (driverData.location) {
      const currentHour = new Date().getHours();
      const weatherLocation = getWeatherLocationForRegion(region);
      let weatherCondition = { rain: 0 };

      try {
        if (WEATHER_API_KEY !== 'YOUR_API_KEY_HERE') {
          const weatherResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${weatherLocation.lat}&lon=${weatherLocation.lon}&appid=${WEATHER_API_KEY}&units=metric`
          );
          weatherCondition.rain = weatherResponse.data.rain ? weatherResponse.data.rain['1h'] || 0 : 0;
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
      }

      const recommendations = getNationwideAIRecommendations(driverData.location, currentHour, weatherCondition);

      socket.emit('ai:recommendations', {
        recommendations,
        region: region,
        prefecture: PREFECTURE_REGIONS[region]?.name || region,
        message: `${PREFECTURE_REGIONS[region]?.name || region}のAI推奨エリアが更新されました`
      });
    }

    // Notify clients with regional info
    io.emit('drivers:update', {
      onlineCount: connectedDrivers.size,
      driversByRegion: getDriversByRegion()
    });

    socket.emit('driver:connected', {
      message: `${PREFECTURE_REGIONS[region]?.name || region}でドライバーとして接続されました`,
      driverId: driverData.driverId || socket.id,
      region: region,
      prefecture: PREFECTURE_REGIONS[region]?.name || region
    });
  });

  // Customer connects with regional detection
  socket.on('customer:connect', (customerData) => {
    console.log('Customer connected:', customerData);

    const region = customerData.location ? detectRegion(customerData.location) : 'unknown';

    const customerInfo = {
      ...customerData,
      socketId: socket.id,
      location: customerData.location || null,
      region: region,
      prefecture: PREFECTURE_REGIONS[region]?.name || region,
      status: 'idle'
    };

    connectedCustomers.set(socket.id, customerInfo);

    // Get regional driver count
    const regionalDrivers = Array.from(connectedDrivers.values())
      .filter(d => d.status === 'online' && d.region === region).length;

    socket.emit('customer:connected', {
      message: `${PREFECTURE_REGIONS[region]?.name || region}でお客様として接続されました`,
      customerId: customerData.customerId || socket.id,
      region: region,
      prefecture: PREFECTURE_REGIONS[region]?.name || region,
      onlineDrivers: regionalDrivers
    });

    // Send regional nearby stations
    if (customerData.location) {
      const regionalStations = getStationsForRegion(region);
      const allStations = Object.values(regionalStations).flat();
      const nearbyStations = getNearbyStations(customerData.location, 2, allStations);

      socket.emit('stations:nearby', {
        stations: nearbyStations,
        region: region,
        prefecture: PREFECTURE_REGIONS[region]?.name || region,
        message: `${PREFECTURE_REGIONS[region]?.name || region}の近くの駅`
      });
    }
  });

  // Enhanced ride request with regional matching
  socket.on('ride:request', async (rideData) => {
    console.log('Ride requested with regional context:', rideData);

    const customerRegion = connectedCustomers.get(socket.id)?.region || 'unknown';

    if (connectedCustomers.has(socket.id)) {
      const customer = connectedCustomers.get(socket.id);
      customer.status = 'waiting';
      connectedCustomers.set(socket.id, customer);
    }

    let rideId = 'ride_' + Date.now();

    // Find regional stations
    const regionalStations = getStationsForRegion(customerRegion);
    const allStations = Object.values(regionalStations).flat();

    let pickupStations = [];
    let destinationStations = [];

    if (rideData.pickupCoords) {
      pickupStations = getNearbyStations(rideData.pickupCoords, 0.5, allStations);
    }
    if (rideData.destinationCoords) {
      destinationStations = getNearbyStations(rideData.destinationCoords, 0.5, allStations);
    }

    const enhancedRideData = {
      ...rideData,
      rideId,
      customerSocketId: socket.id,
      customerRegion: customerRegion,
      status: 'pending',
      createdAt: new Date(),
      pickupStations,
      destinationStations,
      estimatedFare: calculateFare(
        rideData.pickupCoords && rideData.destinationCoords
          ? calculateDistance(rideData.pickupCoords, rideData.destinationCoords)
          : 5
      )
    };

    activeRides.set(rideId, enhancedRideData);

    // Save to Firebase with regional context
    if (db) {
      try {
        await db.collection('rides').add({
          ...enhancedRideData,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('Error creating ride:', error);
      }
    }

    // Notify only drivers in the same region
    connectedDrivers.forEach((driver, driverSocketId) => {
      if (driver.status === 'online' && driver.region === customerRegion) {
        let distance = null;
        if (driver.location && rideData.pickupCoords) {
          distance = calculateDistance(driver.location, rideData.pickupCoords);
        }

        io.to(driverSocketId).emit('ride:new', {
          ...enhancedRideData,
          distanceToPickup: distance,
          pickupStationInfo: pickupStations.length > 0 ? `${pickupStations[0].name}駅近く` : null,
          destinationStationInfo: destinationStations.length > 0 ? `${destinationStations[0].name}駅近く` : null,
          region: customerRegion,
          prefecture: PREFECTURE_REGIONS[customerRegion]?.name || customerRegion
        });
      }
    });

    socket.emit('ride:requested', {
      rideId,
      message: `${PREFECTURE_REGIONS[customerRegion]?.name || customerRegion}の近くのドライバーに配車リクエストを送信しました`,
      status: 'pending',
      region: customerRegion,
      nearbyStations: pickupStations
    });
  });

  // Rest of WebSocket handlers remain similar but with regional context...
  // (ride:accept, ride:complete, disconnect handlers)

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);

    if (connectedDrivers.has(socket.id)) {
      const driver = connectedDrivers.get(socket.id);

      if (db && driver.driverId) {
        try {
          await db.collection('drivers').doc(driver.driverId).update({
            status: 'offline',
            lastSeen: admin.firestore.FieldValue.serverTimestamp()
          });
        } catch (error) {
          console.error('Error updating driver offline:', error);
        }
      }

      connectedDrivers.delete(socket.id);

      io.emit('drivers:update', {
        onlineCount: connectedDrivers.size,
        driversByRegion: getDriversByRegion()
      });
    }

    if (connectedCustomers.has(socket.id)) {
      connectedCustomers.delete(socket.id);
    }
  });
});

// Helper functions
function getDriversByRegion() {
  const regions = {};
  connectedDrivers.forEach(driver => {
    if (!regions[driver.region]) {
      regions[driver.region] = 0;
    }
    if (driver.status === 'online') {
      regions[driver.region]++;
    }
  });
  return regions;
}

function calculateDistance(coord1, coord2) {
  if (!coord1 || !coord2) return null;

  const R = 6371;
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateFare(distanceKm) {
  const baseFare = 500;
  const perKm = 300;
  return Math.round(baseFare + (distanceKm * perKm));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚕 全国AIタクシー Backend running on port ${PORT}`);
  console.log(`📡 WebSocket ready for connections`);
  console.log(`🔥 Firebase: ${db ? 'connected' : 'not connected'}`);
  console.log(`🌦️ Weather API: ${WEATHER_API_KEY === 'YOUR_API_KEY_HERE' ? 'Not configured' : 'Configured'}`);
  console.log(`🗾 Coverage: Nationwide Japan (${Object.keys(JAPAN_STATIONS).length} regions)`);
  console.log(`🚇 Total stations: ${Object.values(JAPAN_STATIONS).reduce((total, region) => total + Object.values(region).flat().length, 0)}`);
});

module.exports = app;
