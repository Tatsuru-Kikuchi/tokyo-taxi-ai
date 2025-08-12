require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios');

// Import Tokyo Stations data
const {
  TOKYO_STATIONS,
  getNearbyStations,
  getHighDemandStations,
  getWeatherSensitiveStations,
  getAIRecommendations
} = require('./tokyo-stations');

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
    console.log('⚠️ Running without Firebase');
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
const TOKYO_LAT = 35.6762;
const TOKYO_LON = 139.6503;

// REST API Routes
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Tokyo Taxi Backend API with Station Data',
    version: '2.1.0',
    endpoints: ['/api/health', '/api/weather/forecast', '/api/stations', '/api/recommendations']
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Tokyo Taxi Backend Running',
    firebase: admin.apps.length > 0 ? 'connected' : 'not connected',
    timestamp: new Date().toISOString(),
    connectedDrivers: connectedDrivers.size,
    connectedCustomers: connectedCustomers.size,
    stationsLoaded: Object.keys(TOKYO_STATIONS).length
  });
});

// Get all Tokyo stations
app.get('/api/stations', (req, res) => {
  const { category, demandLevel, lat, lon, radius } = req.query;

  let stations = [
    ...TOKYO_STATIONS.yamanote,
    ...TOKYO_STATIONS.metro,
    ...TOKYO_STATIONS.airports
  ];

  // Filter by category
  if (category) {
    stations = stations.filter(s => s.category === category);
  }

  // Filter by demand level
  if (demandLevel) {
    stations = stations.filter(s => s.demandLevel === demandLevel);
  }

  // Filter by location
  if (lat && lon && radius) {
    const location = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    stations = getNearbyStations(location, parseFloat(radius));
  }

  res.json({
    count: stations.length,
    stations: stations
  });
});

// Get AI recommendations for drivers
app.get('/api/recommendations', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Location coordinates required' });
  }

  const driverLocation = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
  const currentHour = new Date().getHours();

  // Get weather condition
  let weatherCondition = { rain: 0 };
  try {
    if (WEATHER_API_KEY !== 'YOUR_API_KEY_HERE') {
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${TOKYO_LAT}&lon=${TOKYO_LON}&appid=${WEATHER_API_KEY}&units=metric`
      );
      weatherCondition = {
        rain: weatherResponse.data.rain ? weatherResponse.data.rain['1h'] || 0 : 0,
        description: weatherResponse.data.weather[0].description
      };
    }
  } catch (error) {
    console.error('Weather API error:', error);
  }

  const recommendations = getAIRecommendations(driverLocation, currentHour, weatherCondition);

  res.json({
    recommendations,
    currentConditions: {
      hour: currentHour,
      weather: weatherCondition
    },
    timestamp: new Date().toISOString()
  });
});

// Get nearby stations for a location
app.get('/api/stations/nearby', (req, res) => {
  const { lat, lon, radius = 2 } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Location coordinates required' });
  }

  const location = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
  const nearby = getNearbyStations(location, parseFloat(radius));

  res.json({
    location,
    radius: parseFloat(radius),
    stations: nearby
  });
});

// Get high-demand stations for current time
app.get('/api/stations/high-demand', (req, res) => {
  const { hour } = req.query;
  const currentHour = hour ? parseInt(hour) : new Date().getHours();

  const highDemandStations = getHighDemandStations(currentHour);

  res.json({
    hour: currentHour,
    stations: highDemandStations
  });
});

// Weather forecast with station recommendations
app.get('/api/weather/forecast-real', async (req, res) => {
  try {
    if (WEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
      return res.status(400).json({
        error: 'Weather API key not configured',
        message: 'Please add your OpenWeatherMap API key'
      });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${TOKYO_LAT}&lon=${TOKYO_LON}&appid=${WEATHER_API_KEY}&units=metric`
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

    // Add station recommendations based on weather
    const recommendedStations = rainComing
      ? getWeatherSensitiveStations(true).slice(0, 5)
      : getHighDemandStations(new Date().getHours()).slice(0, 5);

    res.json({
      location: 'Tokyo',
      current: {
        temp: forecasts[0].temp,
        description: forecasts[0].description,
        humidity: forecasts[0].humidity
      },
      forecasts,
      rainAlert: rainComing,
      message: rainComing ? '雨が予想されます。駅周辺の需要が高まります。' : '晴天が続く予報です。',
      recommendedStations: recommendedStations
    });

  } catch (error) {
    console.error('Weather API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// WebSocket handling with station integration
const connectedDrivers = new Map();
const connectedCustomers = new Map();
const activeRides = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Driver connects with location and gets station recommendations
  socket.on('driver:connect', async (driverData) => {
    console.log('Driver connected:', driverData);

    const driverInfo = {
      ...driverData,
      socketId: socket.id,
      status: 'online',
      location: driverData.location || null,
      lastSeen: new Date()
    };

    connectedDrivers.set(socket.id, driverInfo);

    // Update Firebase
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

    // Send initial AI recommendations if driver has location
    if (driverData.location) {
      const currentHour = new Date().getHours();
      let weatherCondition = { rain: 0 };

      try {
        if (WEATHER_API_KEY !== 'YOUR_API_KEY_HERE') {
          const weatherResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${TOKYO_LAT}&lon=${TOKYO_LON}&appid=${WEATHER_API_KEY}&units=metric`
          );
          weatherCondition.rain = weatherResponse.data.rain ? weatherResponse.data.rain['1h'] || 0 : 0;
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
      }

      const recommendations = getAIRecommendations(driverData.location, currentHour, weatherCondition);

      socket.emit('ai:recommendations', {
        recommendations,
        message: 'AI推奨エリアが更新されました'
      });
    }

    // Notify all clients
    io.emit('drivers:update', {
      onlineCount: connectedDrivers.size,
      drivers: Array.from(connectedDrivers.values()).map(d => ({
        id: d.socketId,
        location: d.location,
        status: d.status
      }))
    });

    socket.emit('driver:connected', {
      message: 'ドライバーとして接続されました',
      driverId: driverData.driverId || socket.id
    });
  });

  // Driver location update with station analysis
  socket.on('driver:location', async (location) => {
    console.log('Driver location update:', socket.id, location);

    if (connectedDrivers.has(socket.id)) {
      const driver = connectedDrivers.get(socket.id);
      driver.location = location;
      driver.lastSeen = new Date();
      connectedDrivers.set(socket.id, driver);

      // Get nearby stations
      const nearbyStations = getNearbyStations(location, 1); // Within 1km

      // Send nearby station info to driver
      if (nearbyStations.length > 0) {
        socket.emit('stations:nearby', {
          stations: nearbyStations,
          message: `${nearbyStations.length}つの駅が近くにあります`
        });
      }

      // Update active ride customers with driver location
      const activeRide = Array.from(activeRides.values())
        .find(ride => ride.driverId === socket.id);

      if (activeRide) {
        io.to(activeRide.customerSocketId).emit('driver:location', {
          driverId: socket.id,
          location: location,
          eta: calculateETA(location, activeRide.pickupCoords),
          nearbyStations: nearbyStations.slice(0, 2)
        });
      }
    }
  });

  // Customer connects with location
  socket.on('customer:connect', (customerData) => {
    console.log('Customer connected:', customerData);

    const customerInfo = {
      ...customerData,
      socketId: socket.id,
      location: customerData.location || null,
      status: 'idle'
    };

    connectedCustomers.set(socket.id, customerInfo);

    const onlineDrivers = Array.from(connectedDrivers.values())
      .filter(d => d.status === 'online').length;

    socket.emit('customer:connected', {
      message: 'お客様として接続されました',
      customerId: customerData.customerId || socket.id,
      onlineDrivers: onlineDrivers
    });

    // Send nearby stations if customer has location
    if (customerData.location) {
      const nearbyStations = getNearbyStations(customerData.location, 2);
      socket.emit('stations:nearby', {
        stations: nearbyStations,
        message: '近くの駅'
      });
    }
  });

  // Enhanced ride request with station context
  socket.on('ride:request', async (rideData) => {
    console.log('Ride requested with location:', rideData);

    if (connectedCustomers.has(socket.id)) {
      const customer = connectedCustomers.get(socket.id);
      customer.status = 'waiting';
      connectedCustomers.set(socket.id, customer);
    }

    let rideId = 'ride_' + Date.now();

    // Find nearby stations for pickup and destination
    let pickupStations = [];
    let destinationStations = [];

    if (rideData.pickupCoords) {
      pickupStations = getNearbyStations(rideData.pickupCoords, 0.5); // 500m
    }
    if (rideData.destinationCoords) {
      destinationStations = getNearbyStations(rideData.destinationCoords, 0.5);
    }

    const enhancedRideData = {
      ...rideData,
      rideId,
      customerSocketId: socket.id,
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

    // Save to Firebase
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

    // Notify drivers with enhanced context
    connectedDrivers.forEach((driver, driverSocketId) => {
      if (driver.status === 'online') {
        let distance = null;
        if (driver.location && rideData.pickupCoords) {
          distance = calculateDistance(driver.location, rideData.pickupCoords);
        }

        io.to(driverSocketId).emit('ride:new', {
          ...enhancedRideData,
          distanceToPickup: distance,
          pickupStationInfo: pickupStations.length > 0 ? `${pickupStations[0].name}駅近く` : null,
          destinationStationInfo: destinationStations.length > 0 ? `${destinationStations[0].name}駅近く` : null
        });
      }
    });

    socket.emit('ride:requested', {
      rideId,
      message: '配車リクエストを近くのドライバーに送信しました',
      status: 'pending',
      nearbyStations: pickupStations
    });
  });

  // Standard ride acceptance and completion handlers...
  socket.on('ride:accept', async (data) => {
    const ride = activeRides.get(data.rideId);
    if (!ride) return;

    ride.status = 'accepted';
    ride.driverId = socket.id;
    ride.driverLocation = data.driverLocation;
    activeRides.set(data.rideId, ride);

    if (db) {
      try {
        await db.collection('rides').doc(data.rideId).update({
          status: 'accepted',
          driverId: socket.id,
          driverLocation: data.driverLocation,
          acceptedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('Error accepting ride:', error);
      }
    }

    io.to(ride.customerSocketId).emit('ride:accepted', {
      rideId: data.rideId,
      driverId: socket.id,
      driverLocation: data.driverLocation,
      message: 'ドライバーが配車を承諾しました！',
      estimatedArrival: calculateETA(data.driverLocation, ride.pickupCoords)
    });

    socket.emit('ride:accept:success', {
      rideId: data.rideId,
      message: '配車を承諾しました',
      customer: {
        pickup: ride.pickup,
        destination: ride.destination,
        pickupCoords: ride.pickupCoords,
        destinationCoords: ride.destinationCoords,
        pickupStations: ride.pickupStations,
        destinationStations: ride.destinationStations
      }
    });

    connectedDrivers.forEach((driver, driverSocketId) => {
      if (driverSocketId !== socket.id) {
        io.to(driverSocketId).emit('ride:taken', { rideId: data.rideId });
      }
    });
  });

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
        drivers: Array.from(connectedDrivers.values()).map(d => ({
          id: d.socketId,
          location: d.location,
          status: d.status
        }))
      });
    }

    if (connectedCustomers.has(socket.id)) {
      connectedCustomers.delete(socket.id);
    }
  });
});

// Helper functions
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

function calculateETA(driverLocation, customerLocation) {
  if (!driverLocation || !customerLocation) return '計算中...';

  const distance = calculateDistance(driverLocation, customerLocation);
  const avgSpeedKmh = 30;
  const timeInMinutes = Math.round((distance / avgSpeedKmh) * 60);

  return `約${timeInMinutes}分`;
}

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚕 Tokyo Taxi Backend running on port ${PORT}`);
  console.log(`📡 WebSocket ready for connections`);
  console.log(`🔥 Firebase: ${db ? 'connected' : 'not connected'}`);
  console.log(`🌦️ Weather API: ${WEATHER_API_KEY === 'YOUR_API_KEY_HERE' ? 'Not configured' : 'Configured'}`);
  console.log(`🚇 Station data: ${TOKYO_STATIONS.yamanote.length + TOKYO_STATIONS.metro.length + TOKYO_STATIONS.airports.length} stations loaded`);
  console.log(`📍 Location tracking: Enabled`);
});

module.exports = app;
