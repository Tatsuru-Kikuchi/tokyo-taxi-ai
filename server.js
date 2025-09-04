// 🚕 全国AIタクシー Backend - Production Server
// Version 3.0.1 - Latest Stable Release

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

// ========================================
// EXPRESS APP SETUP
// ========================================

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`📍 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ========================================
// IN-MEMORY DATA STORAGE
// ========================================

const bookings = [];
const drivers = [
  {
    id: 'd1',
    name: '田中運転手',
    location: { latitude: 35.6812, longitude: 139.7671 },
    isOnline: true,
    rating: 4.8,
    vehicle: { type: 'sedan', plateNumber: '品川 500 あ 12-34' }
  },
  {
    id: 'd2',
    name: '佐藤運転手',
    location: { latitude: 35.6896, longitude: 139.6995 },
    isOnline: true,
    rating: 4.9,
    vehicle: { type: 'sedan', plateNumber: '品川 500 い 56-78' }
  },
  {
    id: 'd3',
    name: '山田運転手',
    location: { latitude: 35.6580, longitude: 139.7016 },
    isOnline: true,
    rating: 4.7,
    vehicle: { type: 'minivan', plateNumber: '品川 500 う 90-12' }
  }
];

const stations = [
  { id: 'tokyo', name: '東京駅', region: 'tokyo', lat: 35.6812, lng: 139.7671 },
  { id: 'shinjuku', name: '新宿駅', region: 'tokyo', lat: 35.6896, lng: 139.6995 },
  { id: 'shibuya', name: '渋谷駅', region: 'tokyo', lat: 35.6580, lng: 139.7016 },
  { id: 'ikebukuro', name: '池袋駅', region: 'tokyo', lat: 35.7295, lng: 139.7109 },
  { id: 'shinagawa', name: '品川駅', region: 'tokyo', lat: 35.6284, lng: 139.7387 },
  { id: 'ueno', name: '上野駅', region: 'tokyo', lat: 35.7141, lng: 139.7774 },
  { id: 'osaka', name: '大阪駅', region: 'osaka', lat: 34.7024, lng: 135.4959 },
  { id: 'kyoto', name: '京都駅', region: 'kyoto', lat: 34.9859, lng: 135.7585 },
  { id: 'yokohama', name: '横浜駅', region: 'kanagawa', lat: 35.4657, lng: 139.6222 },
  { id: 'nagoya', name: '名古屋駅', region: 'aichi', lat: 35.1709, lng: 136.8815 }
];

// ========================================
// HEALTH CHECK & STATUS
// ========================================
app.get('/', (req, res) => {
  res.json({
    service: '🚕 全国AIタクシー API',
    status: 'operational',
    version: '3.0.1',
    endpoints: {
      health: '/api/health',
      bookings: '/api/bookings',
      drivers: '/api/drivers/nearby',
      trains: '/api/trains/schedule',
      weather: '/api/weather',
      payment: '/api/payment/test',
      stations: '/api/stations'
    },
    stats: {
      totalStations: stations.length,
      onlineDrivers: drivers.filter(d => d.isOnline).length,
      totalBookings: bookings.length
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: '全国AIタクシー Backend',
    version: '3.0.1',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ========================================
// TRAIN API ENDPOINTS
// ========================================

app.get('/api/trains/schedule', async (req, res) => {
  const { station } = req.query;
  const now = new Date();
  const hour = now.getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);

  const trains = [
    {
      trainId: `JR_YAMANOTE_${Date.now()}_1`,
      lineName: '山手線',
      lineColor: '#9ACD32',
      destination: '品川・渋谷方面',
      platform: '2番線',
      arrivalMinutes: 3,
      status: 'on_time',
      crowdLevel: isRushHour ? 'high' : 'medium',
      cars: 11
    },
    {
      trainId: `JR_CHUO_${Date.now()}_2`,
      lineName: '中央線',
      lineColor: '#FFA500',
      destination: '新宿方面',
      platform: '7番線',
      arrivalMinutes: 5,
      status: isRushHour ? 'delayed' : 'on_time',
      delayMinutes: isRushHour ? 3 : 0,
      crowdLevel: isRushHour ? 'very_high' : 'low',
      cars: 10
    },
    {
      trainId: `JR_KEIHIN_${Date.now()}_3`,
      lineName: '京浜東北線',
      lineColor: '#00BFFF',
      destination: '大宮方面',
      platform: '3番線',
      arrivalMinutes: 7,
      status: 'on_time',
      crowdLevel: 'medium',
      cars: 10
    },
    {
      trainId: `TOKYO_METRO_${Date.now()}_4`,
      lineName: '丸ノ内線',
      lineColor: '#FF0000',
      destination: '荻窪方面',
      platform: 'M1番線',
      arrivalMinutes: 2,
      status: 'on_time',
      crowdLevel: isRushHour ? 'high' : 'low',
      cars: 6
    }
  ];

  res.json({
    station: station || 'tokyo',
    stationName: stations.find(s => s.id === station)?.name || '東京駅',
    trains: trains,
    isRushHour: isRushHour,
    timestamp: now.toISOString()
  });
});

app.post('/api/trains/delays', async (req, res) => {
  const { stationId, lineId } = req.body;
  const hasDelay = Math.random() > 0.7;

  res.json({
    hasDelay,
    delayMinutes: hasDelay ? Math.floor(Math.random() * 10) + 5 : 0,
    reason: hasDelay ? '混雑のため' : null,
    affectedLines: hasDelay ? [lineId] : [],
    recommendation: hasDelay ? 'タクシー利用をお勧めします' : null,
    alternativeRoutes: hasDelay ? ['都営バス', 'タクシー'] : [],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/trains/sync', async (req, res) => {
  const { userId, stationId, trainId } = req.body;

  res.json({
    success: true,
    syncId: `SYNC_${Date.now()}`,
    message: '電車遅延時に自動でタクシーを配車します',
    monitoring: true,
    station: stationId,
    train: trainId,
    userId: userId
  });
});

// ========================================
// BOOKING ENDPOINTS
// ========================================

app.post('/api/bookings/create', async (req, res) => {
  const { pickup, dropoff, userId, trainSync, estimatedFare, paymentMethod } = req.body;

  const booking = {
    id: `BK${Date.now()}`,
    userId,
    pickup,
    dropoff,
    trainSync: trainSync || false,
    status: 'confirmed',
    driver: drivers[Math.floor(Math.random() * drivers.length)],
    estimatedFare: estimatedFare || 2800,
    actualFare: null,
    paymentMethod: paymentMethod || 'cash',
    estimatedArrival: new Date(Date.now() + 5 * 60000).toISOString(), // 5 minutes
    createdAt: new Date().toISOString(),
    confirmationNumber: `ZK${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  };

  bookings.push(booking);

  // Emit to WebSocket clients
  io.emit('new_booking', booking);

  res.json({
    success: true,
    booking,
    message: '予約が確定しました'
  });
});

app.get('/api/bookings/:id', (req, res) => {
  const booking = bookings.find(b => b.id === req.params.id);

  if (!booking) {
    return res.status(404).json({ error: '予約が見つかりません' });
  }

  res.json(booking);
});

app.get('/api/bookings', (req, res) => {
  const { userId, status } = req.query;

  let filteredBookings = bookings;

  if (userId) {
    filteredBookings = filteredBookings.filter(b => b.userId === userId);
  }

  if (status) {
    filteredBookings = filteredBookings.filter(b => b.status === status);
  }

  res.json({
    bookings: filteredBookings,
    total: filteredBookings.length
  });
});

app.put('/api/bookings/:id/status', (req, res) => {
  const { status } = req.body;
  const booking = bookings.find(b => b.id === req.params.id);

  if (!booking) {
    return res.status(404).json({ error: '予約が見つかりません' });
  }

  booking.status = status;
  booking.updatedAt = new Date().toISOString();

  // Emit status change
  io.emit('booking_status_changed', booking);

  res.json({
    success: true,
    booking
  });
});

// ========================================
// DRIVER ENDPOINTS
// ========================================

app.get('/api/drivers/nearby', (req, res) => {
  const { lat, lng, radius } = req.query;

  const userLat = parseFloat(lat) || 35.6812;
  const userLng = parseFloat(lng) || 139.7671;

  // Calculate distance and ETA for each driver
  const nearbyDrivers = drivers
    .filter(d => d.isOnline)
    .map(driver => {
      // Simple distance calculation (in reality, use Haversine formula)
      const distance = Math.sqrt(
        Math.pow(driver.location.latitude - userLat, 2) +
        Math.pow(driver.location.longitude - userLng, 2)
      ) * 111000; // Convert to meters (rough approximation)

      return {
        ...driver,
        distance: Math.round(distance),
        eta: Math.ceil(distance / 500) + 2, // Rough ETA in minutes
        fare_estimate: Math.round(1000 + distance * 2.5) // Base fare + distance
      };
    })
    .filter(d => d.distance <= (parseInt(radius) || 2000))
    .sort((a, b) => a.distance - b.distance);

  res.json({
    drivers: nearbyDrivers,
    total: nearbyDrivers.length,
    searchRadius: radius || 2000,
    userLocation: { lat: userLat, lng: userLng }
  });
});

app.get('/api/drivers/online', (req, res) => {
  const onlineDrivers = drivers.filter(d => d.isOnline);

  res.json({
    drivers: onlineDrivers,
    total: onlineDrivers.length,
    regions: {
      tokyo: onlineDrivers.filter(d => d.location.latitude > 35.5 && d.location.latitude < 35.8).length,
      osaka: onlineDrivers.filter(d => d.location.latitude > 34.5 && d.location.latitude < 34.8).length,
      other: onlineDrivers.filter(d => !(d.location.latitude > 35.5 && d.location.latitude < 35.8) && !(d.location.latitude > 34.5 && d.location.latitude < 34.8)).length
    }
  });
});

app.post('/api/drivers/:id/location', (req, res) => {
  const { latitude, longitude } = req.body;
  const driver = drivers.find(d => d.id === req.params.id);

  if (!driver) {
    return res.status(404).json({ error: 'ドライバーが見つかりません' });
  }

  driver.location = { latitude, longitude };
  driver.lastUpdated = new Date().toISOString();

  // Emit location update
  io.emit('driver_location_updated', {
    driverId: driver.id,
    location: driver.location
  });

  res.json({
    success: true,
    driver
  });
});

app.put('/api/drivers/:id/status', (req, res) => {
  const { isOnline } = req.body;
  const driver = drivers.find(d => d.id === req.params.id);

  if (!driver) {
    return res.status(404).json({ error: 'ドライバーが見つかりません' });
  }

  driver.isOnline = isOnline;
  driver.statusUpdatedAt = new Date().toISOString();

  // Emit status change
  io.emit('driver_status_changed', {
    driverId: driver.id,
    isOnline: driver.isOnline
  });

  res.json({
    success: true,
    driver
  });
});

// ========================================
// WEATHER ENDPOINT
// ========================================

app.get('/api/weather', (req, res) => {
  const { lat, lng } = req.query;

  const weatherConditions = ['clear', 'cloudy', 'rainy', 'heavy_rain'];
  const currentWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];

  const surgeMultiplier = {
    clear: 1.0,
    cloudy: 1.0,
    rainy: 1.15,
    heavy_rain: 1.30
  };

  res.json({
    location: { lat: parseFloat(lat) || 35.6812, lng: parseFloat(lng) || 139.7671 },
    condition: currentWeather,
    temperature: 18 + Math.floor(Math.random() * 15),
    humidity: 40 + Math.floor(Math.random() * 40),
    surgeMultiplier: surgeMultiplier[currentWeather],
    surgeReason: currentWeather === 'rainy' ? '雨天のため' : currentWeather === 'heavy_rain' ? '豪雨のため' : null,
    forecast: '今日は雨の可能性があります',
    hourlyForecast: [
      { hour: new Date().getHours(), condition: currentWeather, temp: 20 },
      { hour: (new Date().getHours() + 1) % 24, condition: 'cloudy', temp: 19 },
      { hour: (new Date().getHours() + 2) % 24, condition: 'rainy', temp: 18 }
    ]
  });
});

// ========================================
// PAYMENT ENDPOINTS (Mock/Safe Mode)
// ========================================

app.get('/api/payment/test', (req, res) => {
  res.json({
    status: 'Payment system ready',
    mode: 'mock',
    environment: 'sandbox',
    acceptedMethods: ['cash', 'credit_card', 'ic_card', 'paypay', 'line_pay'],
    message: 'テスト環境で動作中（実際の課金なし）'
  });
});

app.post('/api/payment/credit-card', async (req, res) => {
  const { amount, customerId, bookingId } = req.body;

  // Mock payment processing
  const payment = {
    success: true,
    paymentId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    method: 'credit_card',
    status: 'COMPLETED',
    amount: amount,
    currency: 'JPY',
    customerId: customerId,
    bookingId: bookingId,
    processedAt: new Date().toISOString(),
    receipt: `https://receipt.zenkoku-ai-taxi.jp/mock/${Date.now()}`,
    message: '支払いが完了しました（テストモード）'
  };

  res.json(payment);
});

app.post('/api/payment/ic-card', async (req, res) => {
  const { amount, customerId, cardType, bookingId } = req.body;

  const payment = {
    success: true,
    paymentId: `IC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    method: 'ic_card',
    cardType: cardType || 'Suica',
    status: 'COMPLETED',
    amount: amount,
    currency: 'JPY',
    customerId: customerId,
    bookingId: bookingId,
    processedAt: new Date().toISOString(),
    balance: Math.floor(Math.random() * 10000) + 1000, // Mock remaining balance
    message: `${cardType || 'ICカード'}での支払いが完了しました（テストモード）`
  };

  res.json(payment);
});

app.post('/api/payment/calculate-fare', (req, res) => {
  const { distance, duration, surgeMultiplier } = req.body;

  const baseFare = 730; // Initial fare
  const distanceFare = Math.ceil(distance / 237) * 90; // ¥90 per 237m
  const timeFare = Math.ceil(duration / 85) * 40; // ¥40 per 85 seconds
  const subtotal = baseFare + distanceFare + timeFare;
  const surgeFare = Math.round(subtotal * (surgeMultiplier || 1));
  const tax = Math.round(surgeFare * 0.1);
  const total = surgeFare + tax;

  res.json({
    breakdown: {
      baseFare,
      distanceFare,
      timeFare,
      surgeMultiplier: surgeMultiplier || 1,
      subtotal,
      surgeFare,
      tax,
      total
    },
    estimatedFare: total,
    currency: 'JPY',
    calculation: '初乗り + 距離料金 + 時間料金 + 需要料金'
  });
});

// ========================================
// STATION ENDPOINTS
// ========================================

app.get('/api/stations', (req, res) => {
  const { region, limit } = req.query;

  let filteredStations = stations;

  if (region) {
    filteredStations = filteredStations.filter(s => s.region === region);
  }

  if (limit) {
    filteredStations = filteredStations.slice(0, parseInt(limit));
  }

  res.json({
    stations: filteredStations,
    total: filteredStations.length,
    regions: [...new Set(stations.map(s => s.region))]
  });
});

app.get('/api/stations/search', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: '検索キーワードが必要です' });
  }

  const results = stations.filter(s =>
    s.name.includes(q) || s.id.includes(q.toLowerCase())
  );

  res.json({
    query: q,
    results,
    total: results.length
  });
});

app.get('/api/stations/nearby', (req, res) => {
  const { lat, lng, limit } = req.query;
  const userLat = parseFloat(lat) || 35.6812;
  const userLng = parseFloat(lng) || 139.7671;
  const maxResults = parseInt(limit) || 5;

  const nearbyStations = stations
    .map(station => {
      const distance = Math.sqrt(
        Math.pow(station.lat - userLat, 2) +
        Math.pow(station.lng - userLng, 2)
      ) * 111000; // Convert to meters

      return { ...station, distance: Math.round(distance) };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults);

  res.json({
    stations: nearbyStations,
    total: nearbyStations.length,
    userLocation: { lat: userLat, lng: userLng }
  });
});

// ========================================
// AI RECOMMENDATIONS ENDPOINT
// ========================================

app.get('/api/ai/hotspots', (req, res) => {
  const { driverId, lat, lng } = req.query;
  const now = new Date();
  const hour = now.getHours();

  // Time-based hotspot recommendations
  let hotspots = [];

  if (hour >= 7 && hour <= 9) {
    // Morning rush hour
    hotspots = [
      { name: '東京駅', lat: 35.6812, lng: 139.7671, demand: 'very_high', reason: '通勤ラッシュ' },
      { name: '新宿駅', lat: 35.6896, lng: 139.6995, demand: 'very_high', reason: '通勤ラッシュ' },
      { name: '渋谷駅', lat: 35.6580, lng: 139.7016, demand: 'high', reason: 'ビジネス街' }
    ];
  } else if (hour >= 17 && hour <= 20) {
    // Evening rush hour
    hotspots = [
      { name: '六本木', lat: 35.6641, lng: 139.7293, demand: 'very_high', reason: '飲み会需要' },
      { name: '銀座', lat: 35.6717, lng: 139.7640, demand: 'high', reason: 'ショッピング' },
      { name: '品川駅', lat: 35.6284, lng: 139.7387, demand: 'high', reason: '新幹線利用客' }
    ];
  } else if (hour >= 22 || hour <= 2) {
    // Late night
    hotspots = [
      { name: '歌舞伎町', lat: 35.6938, lng: 139.7036, demand: 'very_high', reason: '繁華街' },
      { name: '渋谷センター街', lat: 35.6590, lng: 139.6982, demand: 'high', reason: '若者の街' },
      { name: '六本木', lat: 35.6641, lng: 139.7293, demand: 'high', reason: 'ナイトライフ' }
    ];
  } else {
    // Regular hours
    hotspots = [
      { name: '羽田空港', lat: 35.5494, lng: 139.7798, demand: 'medium', reason: '空港利用客' },
      { name: '東京スカイツリー', lat: 35.7101, lng: 139.8107, demand: 'medium', reason: '観光地' },
      { name: 'お台場', lat: 35.6251, lng: 139.7756, demand: 'low', reason: 'レジャー施設' }
    ];
  }

  res.json({
    driverId,
    currentLocation: { lat: parseFloat(lat) || 35.6812, lng: parseFloat(lng) || 139.7671 },
    recommendations: hotspots,
    timestamp: now.toISOString(),
    nextUpdate: new Date(now.getTime() + 30 * 60000).toISOString() // 30 minutes
  });
});

app.get('/api/ai/demand-forecast', (req, res) => {
  const { region, date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  // Generate forecast for next 24 hours
  const forecast = [];
  for (let i = 0; i < 24; i++) {
    const hour = (targetDate.getHours() + i) % 24;
    let demandLevel = 'low';

    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)) {
      demandLevel = 'very_high';
    } else if ((hour >= 12 && hour <= 13) || (hour >= 22 && hour <= 23)) {
      demandLevel = 'high';
    } else if (hour >= 10 && hour <= 16) {
      demandLevel = 'medium';
    }

    forecast.push({
      hour,
      demandLevel,
      estimatedRides: Math.floor(Math.random() * 50) + (demandLevel === 'very_high' ? 100 : demandLevel === 'high' ? 50 : demandLevel === 'medium' ? 20 : 5),
      surgeMultiplier: demandLevel === 'very_high' ? 1.5 : demandLevel === 'high' ? 1.2 : 1.0
    });
  }

  res.json({
    region: region || 'tokyo',
    date: targetDate.toISOString(),
    forecast,
    summary: {
      peakHours: [7, 8, 9, 17, 18, 19, 20],
      totalEstimatedRides: forecast.reduce((sum, f) => sum + f.estimatedRides, 0),
      averageSurge: (forecast.reduce((sum, f) => sum + f.surgeMultiplier, 0) / forecast.length).toFixed(2)
    }
  });
});

// ========================================
// USER MANAGEMENT
// ========================================

const users = [];

app.post('/api/users/register', (req, res) => {
  const { name, email, phone, role } = req.body;

  const user = {
    id: `USER_${Date.now()}`,
    name,
    email,
    phone,
    role: role || 'customer',
    createdAt: new Date().toISOString(),
    isActive: true
  };

  users.push(user);

  res.json({
    success: true,
    user,
    message: '登録が完了しました'
  });
});

app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'ユーザーが見つかりません' });
  }

  res.json(user);
});

// ========================================
// WebSocket CONNECTION HANDLING
// ========================================

const activeConnections = new Map();

io.on('connection', (socket) => {
  console.log('👤 Client connected:', socket.id);
  activeConnections.set(socket.id, { connectedAt: new Date(), type: 'unknown' });

  // Join room based on user type
  socket.on('join', (data) => {
    const { userId, userType } = data;
    socket.join(userType); // 'customer' or 'driver'
    activeConnections.set(socket.id, { ...activeConnections.get(socket.id), userId, userType });
    console.log(`User ${userId} joined as ${userType}`);
  });

  // Handle driver location updates
  socket.on('driver_location_update', (data) => {
    const driver = drivers.find(d => d.id === data.driverId);
    if (driver) {
      driver.location = data.location;
      driver.lastUpdated = new Date().toISOString();

      // Broadcast to all customers
      socket.broadcast.to('customer').emit('driver_moved', {
        driverId: data.driverId,
        location: data.location
      });
    }
  });

  // Handle booking acceptance
  socket.on('accept_booking', (data) => {
    const booking = bookings.find(b => b.id === data.bookingId);
    if (booking) {
      booking.status = 'accepted';
      booking.acceptedAt = new Date().toISOString();
      booking.driverId = data.driverId;

      // Notify customer
      io.emit('booking_accepted', booking);
    }
  });

  // Handle ride start
  socket.on('start_ride', (data) => {
    const booking = bookings.find(b => b.id === data.bookingId);
    if (booking) {
      booking.status = 'in_progress';
      booking.startedAt = new Date().toISOString();

      io.emit('ride_started', booking);
    }
  });

  // Handle ride completion
  socket.on('complete_ride', (data) => {
    const booking = bookings.find(b => b.id === data.bookingId);
    if (booking) {
      booking.status = 'completed';
      booking.completedAt = new Date().toISOString();
      booking.actualFare = data.fare;

      io.emit('ride_completed', booking);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const connection = activeConnections.get(socket.id);
    console.log('👤 Client disconnected:', socket.id, connection?.userType);
    activeConnections.delete(socket.id);
  });
});

// ========================================
// ERROR HANDLING
// ========================================

app.use((error, req, res, next) => {
  console.error('🚨 ERROR:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'エンドポイントが見つかりません',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ========================================
// SERVER START
// ========================================

const PORT = process.env.PORT || 8080;

server.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`🚕 全国AIタクシー Backend v3.0.1`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 WebSocket ready for connections`);
  console.log(`💳 Payment: Mock mode (safe for testing)`);
  console.log(`🗾 Coverage: Nationwide Japan`);
  console.log(`🚇 Stations: ${stations.length}`);
  console.log(`👥 Online Drivers: ${drivers.filter(d => d.isOnline).length}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 Status: Ready for production!`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log('========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  io.close(() => {
    console.log('🔴 WebSocket server closed');
  });
  server.close(() => {
    console.log('🔴 HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📴 SIGINT received, shutting down gracefully...');
  io.close(() => {
    console.log('🔴 WebSocket server closed');
  });
  server.close(() => {
    console.log('🔴 HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
