const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const tf = require('@tensorflow/tfjs-node');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3000;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'your-weather-api-key';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBq3VeVVbuM0sdmGLZN2PD5ns1xaoE3qUQ';

// In-memory storage
const drivers = new Map();
const customers = new Map();
const rides = new Map();
const demandData = new Map();

// AI Models
let demandPredictionModel = null;
let revenuePredictionModel = null;

// Initialize AI models
async function initializeAIModels() {
  try {
    // Create simple demand prediction model
    demandPredictionModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [5], units: 10, activation: 'relu' }),
        tf.layers.dense({ units: 5, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });
    demandPredictionModel.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError'
    });

    // Create revenue prediction model
    revenuePredictionModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [7], units: 14, activation: 'relu' }),
        tf.layers.dense({ units: 7, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });
    revenuePredictionModel.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError'
    });

    console.log('AI models initialized successfully');
  } catch (error) {
    console.error('AI model initialization error:', error);
  }
}

// Weather API
app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  
  try {
    // Simulate weather data with AI predictions
    const weather = {
      temp: Math.floor(Math.random() * 20) + 15,
      condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
      rainProbability: Math.random() * 100,
      humidity: Math.random() * 100,
      windSpeed: Math.random() * 20,
      demandImpact: 0
    };

    // Calculate demand impact based on weather
    if (weather.condition === 'rainy') {
      weather.demandImpact = 30 + Math.random() * 20; // 30-50% increase
    } else if (weather.temp > 35 || weather.temp < 5) {
      weather.demandImpact = 20 + Math.random() * 15; // 20-35% increase
    } else {
      weather.demandImpact = Math.random() * 10; // 0-10% normal fluctuation
    }

    res.json(weather);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Traffic API
app.get('/api/traffic', async (req, res) => {
  const { lat, lon } = req.query;
  
  try {
    // Simulate traffic data
    const congestionLevels = ['low', 'moderate', 'heavy', 'severe'];
    const traffic = {
      congestionLevel: congestionLevels[Math.floor(Math.random() * 4)],
      averageSpeed: 20 + Math.random() * 40,
      incidents: Math.floor(Math.random() * 3),
      delayMinutes: Math.floor(Math.random() * 15),
      alerts: []
    };

    // Generate traffic alerts
    if (traffic.congestionLevel === 'heavy' || traffic.congestionLevel === 'severe') {
      traffic.alerts.push({
        type: 'congestion',
        description: '幹線道路で渋滞が発生しています',
        delay: traffic.delayMinutes
      });
    }

    if (traffic.incidents > 0) {
      traffic.alerts.push({
        type: 'incident',
        description: `${traffic.incidents}件の事故が報告されています`,
        delay: 5
      });
    }

    res.json(traffic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Demand Predictions API
app.post('/api/demand-predictions', async (req, res) => {
  const { location, weather, time } = req.body;
  
  try {
    const predictions = [];
    const baseLocations = [
      { name: '東京駅', lat: 35.6812, lng: 139.7671 },
      { name: '新宿駅', lat: 35.6896, lng: 139.7006 },
      { name: '渋谷駅', lat: 35.6580, lng: 139.7016 },
      { name: '品川駅', lat: 35.6284, lng: 139.7387 },
      { name: '羽田空港', lat: 35.5494, lng: 139.7798 }
    ];

    for (const loc of baseLocations) {
      // Calculate demand score using AI-like logic
      let demandScore = 0.5 + Math.random() * 0.5;
      
      // Time-based adjustments
      const hour = new Date(time).getHours();
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        demandScore *= 1.5; // Rush hour boost
      }
      
      // Weather-based adjustments
      if (weather && weather.condition === 'rainy') {
        demandScore *= 1.3;
      }
      
      // Location-based adjustments
      if (loc.name.includes('空港')) {
        demandScore *= 1.2;
      }
      
      predictions.push({
        ...loc,
        demandScore: Math.min(demandScore, 1),
        predictedRides: Math.floor(demandScore * 50),
        surgeMultiplier: demandScore > 0.7 ? 1 + (demandScore - 0.7) * 2 : 1
      });
    }

    res.json({ predictions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revenue Predictor API
app.post('/api/revenue-predictor', async (req, res) => {
  const { location, weather, traffic, dayOfWeek, hour } = req.body;
  
  try {
    // Calculate base revenue prediction
    let baseRevenue = 2000 + Math.random() * 3000;
    
    // Time adjustments
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      baseRevenue *= 1.4; // Rush hour
    } else if (hour >= 22 || hour <= 5) {
      baseRevenue *= 1.2; // Night time premium
    }
    
    // Day of week adjustments
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      baseRevenue *= 1.3; // Weekend boost
    }
    
    // Weather impact
    if (weather && weather.demandImpact) {
      baseRevenue *= (1 + weather.demandImpact / 100);
    }
    
    // Traffic impact
    if (traffic && traffic.congestionLevel === 'heavy') {
      baseRevenue *= 1.15; // More rides during heavy traffic
    }
    
    // Calculate surge multiplier
    let surgeMultiplier = 1;
    if (baseRevenue > 4000) {
      surgeMultiplier = 1.2 + Math.random() * 0.3;
    } else if (baseRevenue > 3000) {
      surgeMultiplier = 1.1 + Math.random() * 0.2;
    }
    
    // Determine best area
    const areas = ['新宿', '渋谷', '六本木', '銀座', '東京駅周辺'];
    const bestArea = areas[Math.floor(Math.random() * areas.length)];
    
    res.json({
      nextHour: Math.floor(baseRevenue),
      today: Math.floor(baseRevenue * 8),
      bestArea,
      surgeMultiplier: Math.round(surgeMultiplier * 10) / 10,
      confidence: 0.75 + Math.random() * 0.2
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚕 AI Taxi Backend running on port ${PORT}`);
  initializeAIModels();
});
