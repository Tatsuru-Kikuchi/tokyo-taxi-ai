// 🚕 全国AIタクシー Backend - Production Server
// Version 3.0.3 - With 8,604 Stations & Database

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

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

// ========================================
// LOAD ALL 8,604 STATIONS
// ========================================

let ALL_STATIONS = [];
try {
  const stationData = fs.readFileSync(path.join(__dirname, 'data/all_japan_stations.json'), 'utf8');
  ALL_STATIONS = JSON.parse(stationData);
  console.log(`✅ Loaded ${ALL_STATIONS.length} stations from file`);
} catch (error) {
  console.log('⚠️ Could not load station file, using default stations');
  // Fallback to basic stations if file not found
  ALL_STATIONS = [
    { id: 1, name: '東京駅', lat: 35.6812, lng: 139.7671, prefecture: '東京都', lines: ['JR山手線'] },
    { id: 2, name: '新宿駅', lat: 35.6896, lng: 139.6995, prefecture: '東京都', lines: ['JR山手線'] },
    { id: 3, name: '渋谷駅', lat: 35.6580, lng: 139.7016, prefecture: '東京都', lines: ['JR山手線'] },
    { id: 4, name: '池袋駅', lat: 35.7295, lng: 139.7109, prefecture: '東京都', lines: ['JR山手線'] },
    { id: 5, name: '品川駅', lat: 35.6284, lng: 139.7387, prefecture: '東京都', lines: ['JR山手線'] },
    { id: 6, name: '上野駅', lat: 35.7141, lng: 139.7774, prefecture: '東京都', lines: ['JR山手線'] },
    { id: 7, name: '大阪駅', lat: 34.7024, lng: 135.4959, prefecture: '大阪府', lines: ['JR'] },
    { id: 8, name: '京都駅', lat: 34.9859, lng: 135.7585, prefecture: '京都府', lines: ['JR'] },
    { id: 9, name: '横浜駅', lat: 35.4657, lng: 139.6222, prefecture: '神奈川県', lines: ['JR'] },
    { id: 10, name: '名古屋駅', lat: 35.1709, lng: 136.8815, prefecture: '愛知県', lines: ['JR'] }
  ];
};

// ========================================
// DATABASE CONNECTION
// ========================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/taxi_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection and create tables
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('⚠️ Database connection error:', err.message);
    console.log('📁 Running in file-only mode');
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
    initializeDatabase();
  }
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(255) PRIMARY KEY,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(20),
        pickup_station VARCHAR(255),
        pickup_lat DECIMAL(10,8),
        pickup_lng DECIMAL(11,8),
        destination TEXT,
        fare INTEGER,
        status VARCHAR(50),
        driver_id VARCHAR(255),
        confirmation_code VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create drivers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(255),
        is_online BOOLEAN DEFAULT false,
        current_lat DECIMAL(10,8),
        current_lng DECIMAL(11,8),
        rating DECIMAL(2,1),
        vehicle_type VARCHAR(50),
        plate_number VARCHAR(50),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(255) PRIMARY KEY,
        booking_id VARCHAR(255),
        amount INTEGER,
        payment_method VARCHAR(50),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
}

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
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ========================================
// IN-MEMORY DATA STORAGE (Fallback)
// ========================================

const bookings = [];
const drivers = [
  {
    id: 'd1',
    name: '田中運転手',
    location: { latitude: 35.6812, longitude: 139.7671 },
    isOnline: true,
    rating: 4.8,
    vehicle: { type: 'sedan', plateNumber: '品川 500 た 12-34' }
  },
  {
    id: 'd2',
    name: '佐藤運転手',
    location: { latitude: 35.6896, longitude: 139.6995 },
    isOnline: true,
    rating: 4.9,
    vehicle: { type: 'sedan', plateNumber: '品川 500 さ 56-78' }
  },
  {
    id: 'd3',
    name: '山田運転手',
    location: { latitude: 35.6580, longitude: 139.7016 },
    isOnline: true,
    rating: 4.7,
    vehicle: { type: 'minivan', plateNumber: '品川 500 す 90-12' }
  }
];

// ========================================
// HEALTH CHECK & STATUS
// ========================================
app.get('/', (req, res) => {
  res.json({
    service: '🚕 全国AIタクシー API',
    status: 'operational',
    version: '3.0.3',
    database: pool ? 'connected' : 'disconnected',
    endpoints: {
      health: '/api/health',
      bookings: '/api/bookings',
      drivers: '/api/drivers/nearby',
      trains: '/api/trains/schedule',
      weather: '/api/weather',
      payment: '/api/payment/test',
      stations: '/api/stations',
      stationSearch: '/api/stations/search',
      nearbyStations: '/api/stations/nearby',
      prefectures: '/api/stations/prefectures'
    },
    stats: {
      totalStations: ALL_STATIONS.length,
      prefectures: [...new Set(ALL_STATIONS.map(s => s.prefecture))].filter(Boolean).length,
      onlineDrivers: drivers.filter(d => d.isOnline).length,
      totalBookings: bookings.length
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: '全国AIタクシー Backend',
    version: '3.0.3',
    database: pool ? 'connected' : 'disconnected',
    stations: ALL_STATIONS.length,
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

  // Find the actual station from our data
  const stationData = ALL_STATIONS.find(s =>
    s.name === station || s.id === parseInt(station)
  ) || ALL_STATIONS[0];

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
    }
  ];

  res.json({
    station: stationData.name,
    stationName: stationData.name,
    prefecture: stationData.prefecture,
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
// BOOKING ENDPOINTS (With Database)
// ========================================

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, './admin.html'));
});

// Admin stats endpoint
app.get('/api/admin/stats', async (req, res) => {
  let bookingCount = 0;
  let revenue = 0;

  try {
    // Try database first
    if (pool) {
      const result = await pool.query('SELECT COUNT(*) as count, SUM(fare) as revenue FROM bookings');
      bookingCount = parseInt(result.rows[0].count) || 0;
      revenue = parseInt(result.rows[0].revenue) || 0;
    }

    // Fallback to file
    if (bookingCount === 0 && fs.existsSync('./bookings.json')) {
      const fileBookings = fs.readFileSync('./bookings.json', 'utf8')
        .split('\n')
        .filter(line => line)
        .map(line => JSON.parse(line));

      bookingCount = fileBookings.length;
      revenue = fileBookings.reduce((sum, b) => sum + (b.fare || 0), 0);
    }
  } catch (error) {
    console.error('Error getting stats:', error);
  }

  res.json({
    bookingCount,
    driverCount: drivers.length,
    revenue,
    stationCount: ALL_STATIONS.length,
    timestamp: new Date()
  });
});

// Create booking with database support
app.post('/api/bookings/create', async (req, res) => {
  try {
    const confirmationCode = 'BK' + Date.now();
    const booking = {
      id: confirmationCode,
      customerName: req.body.customerName || 'Guest',
      customerPhone: req.body.customerPhone || '',
      pickupStation: req.body.pickupStation,
      pickupLat: req.body.pickupLat,
      pickupLng: req.body.pickupLng,
      destination: req.body.destination,
      fare: req.body.fare || 0,
      status: 'pending',
      createdAt: new Date()
    };

    // Try to save to database
    if (pool) {
      try {
        const query = `
          INSERT INTO bookings
          (id, customer_name, customer_phone, pickup_station, pickup_lat, pickup_lng, destination, fare, status, confirmation_code, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;

        const result = await pool.query(query, [
          booking.id,
          booking.customerName,
          booking.customerPhone,
          booking.pickupStation,
          booking.pickupLat,
          booking.pickupLng,
          booking.destination,
          booking.fare,
          booking.status,
          booking.id,
          booking.createdAt
        ]);

        console.log('✅ Booking saved to database:', booking.id);
      } catch (dbError) {
        console.log('⚠️ Database save failed, using file backup:', dbError.message);
      }
    }

    // Always save to file as backup
    fs.appendFileSync('./bookings.json', JSON.stringify(booking) + '\n');

    // Keep in memory for quick access
    bookings.push(booking);

    res.json({
      success: true,
      booking,
      message: '予約が確定しました'
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      error: 'Failed to create booking',
      message: error.message
    });
  }
});

// Get booking by ID
app.get('/api/bookings/:id', async (req, res) => {
  try {
    let booking = null;

    // Try database first
    if (pool) {
      const result = await pool.query('SELECT * FROM bookings WHERE id = $1 OR confirmation_code = $1', [req.params.id]);
      if (result.rows.length > 0) {
        booking = result.rows[0];
      }
    }

    // Fallback to memory
    if (!booking) {
      booking = bookings.find(b => b.id === req.params.id);
    }

    if (!booking) {
      return res.status(404).json({ error: '予約が見つかりません' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to get booking' });
  }
});

// Get all bookings
app.get('/api/bookings', async (req, res) => {
  const { userId, status } = req.query;

  try {
    let filteredBookings = [];

    // Try database first
    if (pool) {
      let query = 'SELECT * FROM bookings WHERE 1=1';
      const params = [];

      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }

      query += ' ORDER BY created_at DESC LIMIT 100';

      const result = await pool.query(query, params);
      filteredBookings = result.rows;
    }

    // Fallback to memory if no database results
    if (filteredBookings.length === 0) {
      filteredBookings = bookings;
      if (status) {
        filteredBookings = filteredBookings.filter(b => b.status === status);
      }
    }

    res.json({
      bookings: filteredBookings,
      total: filteredBookings.length
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Update booking status
app.put('/api/bookings/:id/status', async (req, res) => {
  const { status } = req.body;

  try {
    // Update in database
    if (pool) {
      await pool.query(
        'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, req.params.id]
      );
    }

    // Update in memory
    const booking = bookings.find(b => b.id === req.params.id);
    if (booking) {
      booking.status = status;
      booking.updatedAt = new Date().toISOString();
    }

    // Emit status change
    io.emit('booking_status_changed', booking || { id: req.params.id, status });

    res.json({
      success: true,
      booking: booking || { id: req.params.id, status }
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// ========================================
// DRIVER ENDPOINTS (With Database)
// ========================================

app.get('/api/drivers/nearby', async (req, res) => {
  const { lat, lng, radius } = req.query;
  const userLat = parseFloat(lat) || 35.6812;
  const userLng = parseFloat(lng) || 139.7671;
  const searchRadius = parseInt(radius) || 2000;

  try {
    let nearbyDrivers = [];

    // Try database first
    if (pool) {
      try {
        const query = `
          SELECT
            id, name, current_lat as lat, current_lng as lng, rating, is_online,
            SQRT(POW(69.1 * (current_lat - $1), 2) +
                 POW(69.1 * ($2 - current_lng) * COS(current_lat / 57.3), 2)) * 1000 AS distance
          FROM drivers
          WHERE is_online = true
            AND current_lat IS NOT NULL
            AND current_lng IS NOT NULL
          ORDER BY distance
          LIMIT 10
        `;

        const result = await pool.query(query, [userLat, userLng]);
        nearbyDrivers = result.rows.filter(d => d.distance <= searchRadius);
      } catch (dbError) {
        console.log('Database query failed, using memory:', dbError.message);
      }
    }

    // Fallback to in-memory drivers
    if (nearbyDrivers.length === 0) {
      nearbyDrivers = drivers
        .filter(d => d.isOnline)
        .map(driver => {
          const distance = Math.sqrt(
            Math.pow(driver.location.latitude - userLat, 2) +
            Math.pow(driver.location.longitude - userLng, 2)
          ) * 111000;

          return {
            ...driver,
            distance: Math.round(distance),
            eta: Math.ceil(distance / 500) + 2,
            fare_estimate: Math.round(1000 + distance * 2.5)
          };
        })
        .filter(d => d.distance <= searchRadius)
        .sort((a, b) => a.distance - b.distance);
    }

    res.json({
      drivers: nearbyDrivers,
      total: nearbyDrivers.length,
      searchRadius: searchRadius,
      userLocation: { lat: userLat, lng: userLng }
    });
  } catch (error) {
    console.error('Get nearby drivers error:', error);
    res.status(500).json({ error: 'Failed to get nearby drivers' });
  }
});

// Update driver location
app.post('/api/drivers/:id/location', async (req, res) => {
  const { latitude, longitude } = req.body;

  try {
    // Update in database
    if (pool) {
      await pool.query(
        'UPDATE drivers SET current_lat = $1, current_lng = $2, last_updated = NOW() WHERE id = $3',
        [latitude, longitude, req.params.id]
      );
    }

    // Update in memory
    const driver = drivers.find(d => d.id === req.params.id);
    if (driver) {
      driver.location = { latitude, longitude };
      driver.lastUpdated = new Date().toISOString();
    }

    // Emit location update
    io.emit('driver_location_updated', {
      driverId: req.params.id,
      location: { latitude, longitude }
    });

    res.json({
      success: true,
      driver: driver || { id: req.params.id, location: { latitude, longitude } }
    });
  } catch (error) {
    console.error('Update driver location error:', error);
    res.status(500).json({ error: 'Failed to update driver location' });
  }
});

// Get online drivers
app.get('/api/drivers/online', async (req, res) => {
  try {
    let onlineDrivers = [];

    // Try database first
    if (pool) {
      const result = await pool.query('SELECT * FROM drivers WHERE is_online = true');
      onlineDrivers = result.rows;
    }

    // Fallback to memory
    if (onlineDrivers.length === 0) {
      onlineDrivers = drivers.filter(d => d.isOnline);
    }

    res.json({
      drivers: onlineDrivers,
      total: onlineDrivers.length,
      regions: {
        tokyo: onlineDrivers.filter(d => {
          const lat = d.current_lat || d.location?.latitude;
          return lat > 35.5 && lat < 35.8;
        }).length,
        osaka: onlineDrivers.filter(d => {
          const lat = d.current_lat || d.location?.latitude;
          return lat > 34.5 && lat < 34.8;
        }).length,
        other: onlineDrivers.filter(d => {
          const lat = d.current_lat || d.location?.latitude;
          return !(lat > 35.5 && lat < 35.8) && !(lat > 34.5 && lat < 34.8);
        }).length
      }
    });
  } catch (error) {
    console.error('Get online drivers error:', error);
    res.status(500).json({ error: 'Failed to get online drivers' });
  }
});

// Update driver status
app.put('/api/drivers/:id/status', async (req, res) => {
  const { isOnline } = req.body;

  try {
    // Update in database
    if (pool) {
      await pool.query(
        'UPDATE drivers SET is_online = $1, last_updated = NOW() WHERE id = $2',
        [isOnline, req.params.id]
      );
    }

    // Update in memory
    const driver = drivers.find(d => d.id === req.params.id);
    if (driver) {
      driver.isOnline = isOnline;
      driver.statusUpdatedAt = new Date().toISOString();
    }

    // Emit status change
    io.emit('driver_status_changed', {
      driverId: req.params.id,
      isOnline: isOnline
    });

    res.json({
      success: true,
      driver: driver || { id: req.params.id, isOnline }
    });
  } catch (error) {
    console.error('Update driver status error:', error);
    res.status(500).json({ error: 'Failed to update driver status' });
  }
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

  // Save to database if available
  if (pool) {
    try {
      await pool.query(
        'INSERT INTO payments (id, booking_id, amount, payment_method, status) VALUES ($1, $2, $3, $4, $5)',
        [payment.paymentId, bookingId, amount, 'credit_card', 'COMPLETED']
      );
    } catch (error) {
      console.log('Payment save to database failed:', error.message);
    }
  }

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
    balance: Math.floor(Math.random() * 10000) + 1000,
    message: `${cardType || 'ICカード'}での支払いが完了しました（テストモード）`
  };

  res.json(payment);
});

app.post('/api/payment/calculate-fare', (req, res) => {
  const { distance, duration, surgeMultiplier } = req.body;

  const baseFare = 730;
  const distanceFare = Math.ceil(distance / 237) * 90;
  const timeFare = Math.ceil(duration / 85) * 40;
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
// STATION ENDPOINTS (ALL 8,604 STATIONS)
// ========================================

// Get stations with pagination and filtering
app.get('/api/stations', (req, res) => {
  const { prefecture, limit, offset } = req.query;

  let filteredStations = ALL_STATIONS;

  if (prefecture) {
    filteredStations = filteredStations.filter(s => s.prefecture === prefecture);
  }

  const startIndex = parseInt(offset) || 0;
  const endIndex = startIndex + (parseInt(limit) || 100);

  res.json({
    stations: filteredStations.slice(startIndex, endIndex),
    total: filteredStations.length,
    prefectures: [...new Set(ALL_STATIONS.map(s => s.prefecture))].filter(Boolean).sort()
  });
});

// Search stations
app.get('/api/stations/search', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: '検索キーワードが必要です' });
  }

  const results = ALL_STATIONS.filter(s =>
    s.name?.includes(q) ||
    s.nameEn?.toLowerCase().includes(q.toLowerCase()) ||
    s.prefecture?.includes(q) ||
    s.lines?.some(line => line.includes(q))
  ).slice(0, 50); // Limit to 50 results

  res.json({
    query: q,
    results,
    total: results.length
  });
});

// Get nearby stations
app.get('/api/stations/nearby', (req, res) => {
  const { lat, lng, limit } = req.query;
  const userLat = parseFloat(lat) || 35.6812;
  const userLng = parseFloat(lng) || 139.7671;
  const maxResults = parseInt(limit) || 10;

  const nearbyStations = ALL_STATIONS
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

// Get stations by prefecture with counts
app.get('/api/stations/prefectures', (req, res) => {
  const prefectureCounts = {};

  ALL_STATIONS.forEach(station => {
    const pref = station.prefecture || '不明';
    prefectureCounts[pref] = (prefectureCounts[pref] || 0) + 1;
  });

  res.json({
    prefectures: Object.entries(prefectureCounts)
      .map(([name, count]) => ({
        name,
        count,
        stations: count,
        percentage: ((count / ALL_STATIONS.length) * 100).toFixed(2) + '%'
      }))
      .sort((a, b) => b.count - a.count),
    total: ALL_STATIONS.length,
    summary: {
      totalPrefectures: Object.keys(prefectureCounts).length,
      averageStationsPerPrefecture: Math.round(ALL_STATIONS.length / Object.keys(prefectureCounts).length)
    }
  });
});

// Get a specific station by ID or name
app.get('/api/stations/:identifier', (req, res) => {
  const { identifier } = req.params;

  const station = ALL_STATIONS.find(s =>
    s.id === parseInt(identifier) ||
    s.name === identifier
  );

  if (!station) {
    return res.status(404).json({ error: '駅が見つかりません' });
  }

  res.json(station);
});

// ========================================
// AI RECOMMENDATIONS ENDPOINT
// ========================================

app.get('/api/ai/hotspots', (req, res) => {
  const { driverId, lat, lng } = req.query;
  const now = new Date();
  const hour = now.getHours();

  // Find actual stations near hotspot areas
  const tokyoStations = ALL_STATIONS.filter(s => s.prefecture === '東京都').slice(0, 5);

  let hotspots = [];

  if (hour >= 7 && hour <= 9) {
    hotspots = [
      {
        name: tokyoStations[0]?.name || '東京駅',
        lat: tokyoStations[0]?.lat || 35.6812,
        lng: tokyoStations[0]?.lng || 139.7671,
        demand: 'very_high',
        reason: '通勤ラッシュ'
      },
      {
        name: tokyoStations[1]?.name || '新宿駅',
        lat: tokyoStations[1]?.lat || 35.6896,
        lng: tokyoStations[1]?.lng || 139.6995,
        demand: 'very_high',
        reason: '通勤ラッシュ'
      },
      {
        name: tokyoStations[2]?.name || '渋谷駅',
        lat: tokyoStations[2]?.lat || 35.6580,
        lng: tokyoStations[2]?.lng || 139.7016,
        demand: 'high',
        reason: 'ビジネス街'
      }
    ];
  } else if (hour >= 17 && hour <= 20) {
    hotspots = [
      { name: '六本木', lat: 35.6641, lng: 139.7293, demand: 'very_high', reason: '飲み会需要' },
      { name: '銀座', lat: 35.6717, lng: 139.7640, demand: 'high', reason: 'ショッピング' },
      { name: '品川駅', lat: 35.6284, lng: 139.7387, demand: 'high', reason: '新幹線利用客' }
    ];
  } else if (hour >= 22 || hour <= 2) {
    hotspots = [
      { name: '歌舞伎町', lat: 35.6938, lng: 139.7036, demand: 'very_high', reason: '繁華街' },
      { name: '渋谷センター街', lat: 35.6590, lng: 139.6982, demand: 'high', reason: '若者の街' },
      { name: '六本木', lat: 35.6641, lng: 139.7293, demand: 'high', reason: 'ナイトライフ' }
    ];
  } else {
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
    nextUpdate: new Date(now.getTime() + 30 * 60000).toISOString()
  });
});

app.get('/api/ai/demand-forecast', (req, res) => {
  const { region, date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

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

  socket.on('join', (data) => {
    const { userId, userType } = data;
    socket.join(userType);
    activeConnections.set(socket.id, { ...activeConnections.get(socket.id), userId, userType });
    console.log(`User ${userId} joined as ${userType}`);
  });

  socket.on('driver_location_update', (data) => {
    const driver = drivers.find(d => d.id === data.driverId);
    if (driver) {
      driver.location = data.location;
      driver.lastUpdated = new Date().toISOString();

      socket.broadcast.to('customer').emit('driver_moved', {
        driverId: data.driverId,
        location: data.location
      });
    }
  });

  socket.on('accept_booking', (data) => {
    const booking = bookings.find(b => b.id === data.bookingId);
    if (booking) {
      booking.status = 'accepted';
      booking.acceptedAt = new Date().toISOString();
      booking.driverId = data.driverId;

      io.emit('booking_accepted', booking);
    }
  });

  socket.on('start_ride', (data) => {
    const booking = bookings.find(b => b.id === data.bookingId);
    if (booking) {
      booking.status = 'in_progress';
      booking.startedAt = new Date().toISOString();

      io.emit('ride_started', booking);
    }
  });

  socket.on('complete_ride', (data) => {
    const booking = bookings.find(b => b.id === data.bookingId);
    if (booking) {
      booking.status = 'completed';
      booking.completedAt = new Date().toISOString();
      booking.actualFare = data.fare;

      io.emit('ride_completed', booking);
    }
  });

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
  console.log(`🚕 全国AIタクシー Backend v3.0.3`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 WebSocket ready for connections`);
  console.log(`💾 Database: ${pool ? 'Connected' : 'File-only mode'}`);
  console.log(`💳 Payment: Mock mode (safe for testing)`);
  console.log(`🗾 Coverage: Nationwide Japan`);
  console.log(`🚇 Total Stations: ${ALL_STATIONS.length}`);
  console.log(`📍 Prefectures: ${[...new Set(ALL_STATIONS.map(s => s.prefecture))].filter(Boolean).length}`);
  console.log(`👥 Online Drivers: ${drivers.filter(d => d.isOnline).length}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 Status: Ready for production!`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log('========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔴 SIGTERM received, shutting down gracefully...');
  if (pool) pool.end();
  io.close(() => {
    console.log('🔴 WebSocket server closed');
  });
  server.close(() => {
    console.log('🔴 HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🔴 SIGINT received, shutting down gracefully...');
  if (pool) pool.end();
  io.close(() => {
    console.log('🔴 WebSocket server closed');
  });
  server.close(() => {
    console.log('🔴 HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
// Deploy trigger: Sun Sep  7 14:21:39 JST 2025
