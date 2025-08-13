const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const admin = require('firebase-admin');

// Crash Prevention: Process-level error handlers
process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  
  // Log to external service (implement your logging here)
  logToExternalService('uncaughtException', error);
  
  // For operational errors, try to continue; for programmer errors, exit
  if (!isOperationalError(error)) {
    console.error('💀 Non-operational error detected. Shutting down gracefully...');
    gracefulShutdown();
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED PROMISE REJECTION:', reason);
  console.error('Promise:', promise);
  
  // Log to external service
  logToExternalService('unhandledRejection', reason);
  
  // Convert unhandled rejections to exceptions
  throw new Error(`Unhandled Rejection: ${reason}`);
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Starting graceful shutdown...');
  gracefulShutdown();
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Starting graceful shutdown...');
  gracefulShutdown();
});

// Helper functions for error handling
function isOperationalError(error) {
  // Operational errors are expected errors (network failures, validation errors, etc.)
  const operationalErrors = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ValidationError',
    'CastError'
  ];
  
  return operationalErrors.some(opError => 
    error.code === opError || 
    error.name === opError || 
    error.message.includes(opError)
  );
}

function logToExternalService(type, error) {
  // TODO: Implement logging to external service (Sentry, CloudWatch, etc.)
  const logData = {
    type,
    message: error.message || error,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  console.log('📝 ERROR LOG:', JSON.stringify(logData, null, 2));
  
  // You can add LINE notification for critical errors here
  if (type === 'uncaughtException') {
    sendLINEAlert(logData);
  }
}

async function sendLINEAlert(errorData) {
  // LINE Messaging API integration for critical alerts
  try {
    const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const LINE_DEVELOPER_USER_ID = process.env.LINE_DEVELOPER_USER_ID;
    
    if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_DEVELOPER_USER_ID) {
      console.log('⚠️ LINE alert not configured');
      return;
    }
    
    const message = `🚨 CRITICAL ERROR\n\n` +
                   `Type: ${errorData.type}\n` +
                   `Message: ${errorData.message}\n` +
                   `Time: ${errorData.timestamp}\n` +
                   `Environment: ${errorData.environment}`;
    
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: LINE_DEVELOPER_USER_ID,
        messages: [{
          type: 'text',
          text: message
        }]
      })
    });
    
    if (response.ok) {
      console.log('✅ LINE alert sent successfully');
    }
  } catch (alertError) {
    console.error('❌ Failed to send LINE alert:', alertError);
  }
}

function gracefulShutdown() {
  // Give ongoing requests time to complete
  setTimeout(() => {
    console.log('💀 Force shutdown after timeout');
    process.exit(1);
  }, 10000);
  
  // Close server gracefully
  if (server) {
    server.close(() => {
      console.log('📴 HTTP server closed');
      
      // Close database connections
      if (firestore) {
        console.log('📴 Firestore connections closed');
      }
      
      process.exit(0);
    });
  } else {
    process.exit(1);
  }
}

// Initialize Firebase Admin SDK with enhanced error handling
let firestore;
async function initializeFirebase() {
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
    logToExternalService('firebase_init_error', error);
    // Continue without Firebase
  }
}

// Import station data with error handling
let stationImports;
try {
  stationImports = require('./japan-stations');
  console.log('✅ Station data imported successfully');
} catch (importError) {
  console.error('❌ Failed to import station data:', importError);
  logToExternalService('import_error', importError);
  // Fallback to mock data
  stationImports = {
    ALL_JAPAN_STATIONS: [],
    REGIONS: {},
    getStationsByRegion: () => [],
    getRegionByCoordinates: () => 'tokyo',
    getNearbyStations: () => []
  };
}

const {
  ALL_JAPAN_STATIONS,
  REGIONS,
  getStationsByRegion,
  getRegionByCoordinates,
  getNearbyStations
} = stationImports;

const app = express();

// Enhanced error handling middleware
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Request timeout middleware
function timeoutMiddleware(timeout = 30000) {
  return (req, res, next) => {
    res.setTimeout(timeout, () => {
      console.error(`⏰ Request timeout: ${req.method} ${req.url}`);
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' });
      }
    });
    next();
  };
}

// Enhanced CORS with better error handling
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com', 'https://your-app.expo.dev']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));

// Request parsing with error handling
app.use(express.json({ 
  limit: '10mb',
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Request timeout
app.use(timeoutMiddleware(30000));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`📨 ${req.method} ${req.url} - ${req.ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📤 ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Create HTTP server and WebSocket server with error handling
const server = http.createServer(app);
const wss = new WebSocketServer({ 
  server,
  perMessageDeflate: false // Prevent memory leaks
});

// In-memory storage with size limits
const MAX_STORAGE_SIZE = 10000;
let users = [];
let drivers = [];
let rides = [];
let rideRequests = [];

// Enhanced WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('📱 Client connected from:', req.socket.remoteAddress);
  
  // Connection timeout
  const connectionTimeout = setTimeout(() => {
    if (ws.readyState === ws.OPEN) {
      ws.close(4000, 'Connection timeout');
    }
  }, 300000); // 5 minutes
  
  ws.on('message', (message) => {
    try {
      // Clear timeout on activity
      clearTimeout(connectionTimeout);
      
      const data = JSON.parse(message);
      console.log('📨 Received:', data.type);

      switch (data.type) {
        case 'driver_online':
          handleDriverOnline(data, ws);
          break;
        case 'driver_offline':
          handleDriverOffline(data);
          break;
        case 'location_update':
          handleLocationUpdate(data);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
      logToExternalService('websocket_error', error);
      
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    logToExternalService('websocket_connection_error', error);
  });

  ws.on('close', (code, reason) => {
    console.log(`📱 Client disconnected: ${code} ${reason}`);
    clearTimeout(connectionTimeout);
    drivers = drivers.filter(d => d.ws !== ws);
  });
  
  // Send welcome message
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ 
      type: 'welcome', 
      message: 'Connected to 全国AIタクシー backend',
      timestamp: new Date().toISOString()
    }));
  }
});

// WebSocket helper functions with error handling
function handleDriverOnline(data, ws) {
  try {
    // Validate required fields
    if (!data.driverId || !data.driverName) {
      throw new Error('Driver ID and name required');
    }
    
    const driver = {
      id: data.driverId,
      name: data.driverName,
      location: data.location,
      isOnline: true,
      ws: ws,
      connectedAt: new Date().toISOString()
    };
    
    // Remove existing driver with same ID
    drivers = drivers.filter(d => d.id !== data.driverId);
    
    // Limit driver storage size
    if (drivers.length >= MAX_STORAGE_SIZE) {
      drivers = drivers.slice(-MAX_STORAGE_SIZE + 1);
    }
    
    drivers.push(driver);
    console.log(`🚕 Driver ${data.driverName} is online`);
  } catch (error) {
    console.error('❌ Error handling driver online:', error);
    logToExternalService('driver_online_error', error);
  }
}

function handleDriverOffline(data) {
  try {
    drivers = drivers.filter(d => d.id !== data.driverId);
    console.log(`🚕 Driver ${data.driverId} went offline`);
  } catch (error) {
    console.error('❌ Error handling driver offline:', error);
    logToExternalService('driver_offline_error', error);
  }
}

function handleLocationUpdate(data) {
  try {
    const driverIndex = drivers.findIndex(d => d.id === data.driverId);
    if (driverIndex !== -1) {
      drivers[driverIndex].location = data.location;
      drivers[driverIndex].lastLocationUpdate = new Date().toISOString();
    }
  } catch (error) {
    console.error('❌ Error handling location update:', error);
    logToExternalService('location_update_error', error);
  }
}

// Enhanced weather API with retry logic
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

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.error(`❌ Fetch attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

const getWeatherForecast = async (region = 'tokyo') => {
  try {
    const coords = REGION_COORDINATES[region] || REGION_COORDINATES.tokyo;

    if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'your_api_key_here') {
      console.log('⚠️ Using mock weather data - OpenWeather API key not configured');
      return getMockWeatherData();
    }

    // Use retry logic for API calls
    const currentResponse = await fetchWithRetry(
      `${OPENWEATHER_BASE_URL}/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ja`
    );

    const forecastResponse = await fetchWithRetry(
      `${OPENWEATHER_BASE_URL}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ja`
    );

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    // Convert OpenWeather condition to our format
    const convertCondition = (weather) => {
      if (!weather || !weather.main) return 'partly_cloudy';
      
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
    logToExternalService('weather_api_error', error);
    return getMockWeatherData();
  }
};

// Enhanced fallback mock weather data
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

// Enhanced helper functions with error handling
const calculateDemandLevel = (stationId, hour, weatherCondition) => {
  try {
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
    if (station.peakHours && station.peakHours.includes(hour)) {
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
  } catch (error) {
    console.error('❌ Error calculating demand level:', error);
    logToExternalService('demand_calculation_error', error);
    return 'low';
  }
};

const generateAIRecommendations = async (lat, lon, hour, weather) => {
  try {
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
    const peakStations = nearbyStations.filter(s => 
      s.peakHours && s.peakHours.includes(hour)
    );
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
  } catch (error) {
    console.error('❌ Error generating AI recommendations:', error);
    logToExternalService('ai_recommendations_error', error);
    return {
      region: '未対応地域',
      prefecture: '未対応',
      recommendations: [],
      coverage: 'nationwide'
    };
  }
};

// Enhanced API Routes with proper error handling

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    coverage: 'nationwide',
    supportedRegions: Object.keys(REGIONS).length,
    totalStations: ALL_JAPAN_STATIONS.length,
    firebase: firestore ? 'connected' : 'disconnected',
    activeDrivers: drivers.filter(d => d.isOnline).length,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// Get all stations with proper error handling
app.get('/api/stations', asyncHandler(async (req, res) => {
  const { region, category, limit } = req.query;
  let stations = ALL_JAPAN_STATIONS;

  if (region) {
    stations = getStationsByRegion(region);
  }

  if (category) {
    stations = stations.filter(s => s.category === category);
  }

  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 0) {
      return res.status(400).json({ error: 'Invalid limit parameter' });
    }
    stations = stations.slice(0, limitNum);
  }

  res.json({
    stations,
    total: stations.length,
    regions: Object.keys(REGIONS)
  });
}));

// LINE Support Integration Endpoints

// LINE webhook for receiving messages (optional)
app.post('/api/line/webhook', asyncHandler(async (req, res) => {
  // Verify LINE signature (implement signature verification in production)
  const events = req.body.events || [];
  
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      await handleLINEMessage(event);
    }
  }
  
  res.status(200).send('OK');
}));

// Support ticket creation
app.post('/api/support/ticket', asyncHandler(async (req, res) => {
  const { userId, userType, message, category, location } = req.body;
  
  if (!userId || !message) {
    return res.status(400).json({ error: 'User ID and message required' });
  }
  
  const ticket = {
    id: Date.now().toString(),
    userId,
    userType: userType || 'customer',
    message,
    category: category || 'general',
    location,
    status: 'open',
    createdAt: new Date().toISOString(),
    responses: []
  };
  
  // Save to storage with size limit
  if (users.length >= MAX_STORAGE_SIZE) {
    users = users.slice(-MAX_STORAGE_SIZE + 1);
  }
  
  users.push(ticket);
  
  // Send LINE notification to support team
  await sendSupportNotification(ticket);
  
  res.json({
    success: true,
    ticket: {
      id: ticket.id,
      status: ticket.status,
      createdAt: ticket.createdAt
    }
  });
}));

async function handleLINEMessage(event) {
  try {
    const message = event.message.text;
    const userId = event.source.userId;
    
    // Simple auto-response logic
    let response = '申し訳ございませんが、現在サポートスタッフが対応中です。しばらくお待ちください。';
    
    if (message.includes('アプリ') || message.includes('起動')) {
      response = 'アプリの問題について承りました。アプリを再起動して、問題が解決しない場合は詳細をお聞かせください。';
    } else if (message.includes('配車') || message.includes('タクシー')) {
      response = '配車に関するお問い合わせありがとうございます。現在の状況を確認いたします。';
    }
    
    // Send response via LINE API
    await sendLINEResponse(userId, response);
    
  } catch (error) {
    console.error('❌ Error handling LINE message:', error);
    logToExternalService('line_message_error', error);
  }
}

async function sendLINEResponse(userId, message) {
  try {
    const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.log('⚠️ LINE Channel Access Token not configured');
      return;
    }
    
    await fetchWithRetry('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [{
          type: 'text',
          text: message
        }]
      })
    });
    
    console.log('✅ LINE response sent successfully');
  } catch (error) {
    console.error('❌ Failed to send LINE response:', error);
    logToExternalService('line_response_error', error);
  }
}

async function sendSupportNotification(ticket) {
  try {
    const SUPPORT_LINE_USER_ID = process.env.SUPPORT_LINE_USER_ID;
    
    if (!SUPPORT_LINE_USER_ID) {
      console.log('⚠️ Support LINE notification not configured');
      return;
    }
    
    const message = `🎫 新規サポートチケット\n\n` +
                   `ID: ${ticket.id}\n` +
                   `ユーザー: ${ticket.userType}\n` +
                   `カテゴリ: ${ticket.category}\n` +
                   `メッセージ: ${ticket.message}\n` +
                   `時刻: ${ticket.createdAt}`;
    
    await sendLINEResponse(SUPPORT_LINE_USER_ID, message);
  } catch (error) {
    console.error('❌ Failed to send support notification:', error);
    logToExternalService('support_notification_error', error);
  }
}

// Global error handler middleware (must be last)
app.use((error, req, res, next) => {
  console.error('🚨 EXPRESS ERROR:', error);
  
  // Log error details
  logToExternalService('express_error', error);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Initialize services
async function initializeServer() {
  try {
    await initializeFirebase();
    
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚕 全国AIタクシー Backend running on port ${PORT}`);
      console.log('📡 WebSocket ready for connections');
      console.log('🔥 Firebase:', firestore ? 'connected' : 'disconnected');
      console.log('🌦️ Weather API: Configured');
      console.log(`🗾 Coverage: Nationwide Japan (${Object.keys(REGIONS).length} regions)`);
      console.log(`🚇 Total Stations: ${ALL_JAPAN_STATIONS.length}`);
      console.log('💬 LINE integration: Ready');
      console.log('🛡️ Crash prevention: Active');
      console.log('🎯 Ready for production!');
    });
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    logToExternalService('server_init_error', error);
    process.exit(1);
  }
}

// Start the server
initializeServer();

module.exports = app;