// japan-stations.js - Complete Japan Railway Station Database
const JAPAN_STATIONS = {
  // Tokyo Area (existing)
  tokyo: {
    // Your existing Tokyo stations data
    ...TOKYO_STATIONS
  },

  // Osaka/Kansai Region
  osaka: {
    major: [
      {
        id: 'osaka-umeda',
        name: '大阪',
        nameEn: 'Osaka',
        coords: { latitude: 34.7024, longitude: 135.4959 },
        lines: ['JR Tokaido', 'JR Osaka Loop', 'JR Kyoto', 'Hanshin', 'Hankyu', 'Subway Midosuji'],
        demandLevel: 'very_high',
        peakHours: ['07:00-09:00', '17:00-20:00'],
        weatherSensitive: true,
        category: 'major_hub',
        prefecture: 'osaka'
      },
      {
        id: 'namba',
        name: '難波',
        nameEn: 'Namba',
        coords: { latitude: 34.6658, longitude: 135.5009 },
        lines: ['Nankai', 'Kintetsu', 'Subway Midosuji', 'Subway Sennichimae'],
        demandLevel: 'very_high',
        peakHours: ['10:00-23:00'],
        weatherSensitive: true,
        category: 'entertainment',
        prefecture: 'osaka'
      },
      {
        id: 'tennoji',
        name: '天王寺',
        nameEn: 'Tennoji',
        coords: { latitude: 34.6452, longitude: 135.5066 },
        lines: ['JR Osaka Loop', 'JR Yamatoji', 'Kintetsu', 'Subway Midosuji'],
        demandLevel: 'high',
        peakHours: ['07:30-09:00', '17:30-19:30'],
        weatherSensitive: true,
        category: 'major_hub',
        prefecture: 'osaka'
      },
      {
        id: 'kyobashi-osaka',
        name: '京橋',
        nameEn: 'Kyobashi',
        coords: { latitude: 34.6939, longitude: 135.5273 },
        lines: ['JR Osaka Loop', 'Keihan', 'Subway Nagahori'],
        demandLevel: 'high',
        peakHours: ['08:00-09:00', '18:00-19:30'],
        weatherSensitive: false,
        category: 'business',
        prefecture: 'osaka'
      }
    ]
  },

  // Nagoya/Chubu Region
  nagoya: {
    major: [
      {
        id: 'nagoya-station',
        name: '名古屋',
        nameEn: 'Nagoya',
        coords: { latitude: 35.1706, longitude: 136.8816 },
        lines: ['JR Tokaido', 'JR Chuo', 'Kintetsu', 'Meitetsu', 'Subway Higashiyama', 'Subway Sakura-dori'],
        demandLevel: 'very_high',
        peakHours: ['07:00-09:00', '17:00-19:00'],
        weatherSensitive: true,
        category: 'major_hub',
        prefecture: 'aichi'
      },
      {
        id: 'sakae',
        name: '栄',
        nameEn: 'Sakae',
        coords: { latitude: 35.1681, longitude: 136.9088 },
        lines: ['Subway Higashiyama', 'Subway Meijo', 'Subway Meiko'],
        demandLevel: 'very_high',
        peakHours: ['10:00-22:00'],
        weatherSensitive: true,
        category: 'shopping',
        prefecture: 'aichi'
      },
      {
        id: 'kanayama',
        name: '金山',
        nameEn: 'Kanayama',
        coords: { latitude: 35.1425, longitude: 136.9001 },
        lines: ['JR Tokaido', 'JR Chuo', 'Meitetsu', 'Subway Meijo', 'Subway Meiko'],
        demandLevel: 'high',
        peakHours: ['07:30-09:00', '17:30-19:30'],
        weatherSensitive: true,
        category: 'major_hub',
        prefecture: 'aichi'
      },
      {
        id: 'ozone',
        name: '大曽根',
        nameEn: 'Ozone',
        coords: { latitude: 35.1936, longitude: 136.9314 },
        lines: ['JR Chuo', 'Meitetsu Seto', 'Subway Meijo'],
        demandLevel: 'medium',
        peakHours: ['08:00-09:00', '18:00-19:00'],
        weatherSensitive: false,
        category: 'residential',
        prefecture: 'aichi'
      }
    ]
  },

  // Kyoto
  kyoto: {
    major: [
      {
        id: 'kyoto-station',
        name: '京都',
        nameEn: 'Kyoto',
        coords: { latitude: 34.9857, longitude: 135.7589 },
        lines: ['JR Tokaido', 'JR San-in', 'Kintetsu', 'Subway Karasuma'],
        demandLevel: 'very_high',
        peakHours: ['08:00-10:00', '16:00-18:00'],
        weatherSensitive: true,
        category: 'tourist',
        prefecture: 'kyoto'
      },
      {
        id: 'gion-shijo',
        name: '祇園四条',
        nameEn: 'Gion-Shijo',
        coords: { latitude: 35.0030, longitude: 135.7751 },
        lines: ['Keihan'],
        demandLevel: 'high',
        peakHours: ['10:00-12:00', '15:00-18:00'],
        weatherSensitive: true,
        category: 'tourist',
        prefecture: 'kyoto'
      }
    ]
  },

  // Fukuoka/Kyushu
  fukuoka: {
    major: [
      {
        id: 'hakata',
        name: '博多',
        nameEn: 'Hakata',
        coords: { latitude: 33.5903, longitude: 130.4207 },
        lines: ['JR Tokaido', 'JR Kagoshima', 'Subway Kuko'],
        demandLevel: 'very_high',
        peakHours: ['07:00-09:00', '17:00-19:00'],
        weatherSensitive: true,
        category: 'major_hub',
        prefecture: 'fukuoka'
      },
      {
        id: 'tenjin',
        name: '天神',
        nameEn: 'Tenjin',
        coords: { latitude: 33.5908, longitude: 130.3993 },
        lines: ['Subway Kuko', 'Subway Nanakuma'],
        demandLevel: 'very_high',
        peakHours: ['10:00-22:00'],
        weatherSensitive: true,
        category: 'shopping',
        prefecture: 'fukuoka'
      }
    ]
  },

  // Sendai/Tohoku
  sendai: {
    major: [
      {
        id: 'sendai-station',
        name: '仙台',
        nameEn: 'Sendai',
        coords: { latitude: 38.2606, longitude: 140.8821 },
        lines: ['JR Tohoku', 'JR Senzan', 'Subway Namboku', 'Subway Tozai'],
        demandLevel: 'high',
        peakHours: ['07:30-09:00', '17:30-19:00'],
        weatherSensitive: true,
        category: 'major_hub',
        prefecture: 'miyagi'
      }
    ]
  },

  // Sapporo/Hokkaido
  sapporo: {
    major: [
      {
        id: 'sapporo-station',
        name: '札幌',
        nameEn: 'Sapporo',
        coords: { latitude: 43.0686, longitude: 141.3506 },
        lines: ['JR Hakodate', 'JR Chitose', 'Subway Namboku'],
        demandLevel: 'high',
        peakHours: ['07:30-09:00', '17:30-19:00'],
        weatherSensitive: true,
        category: 'major_hub',
        prefecture: 'hokkaido'
      },
      {
        id: 'susukino',
        name: 'すすきの',
        nameEn: 'Susukino',
        coords: { latitude: 43.0541, longitude: 141.3533 },
        lines: ['Subway Namboku'],
        demandLevel: 'very_high',
        peakHours: ['19:00-02:00'],
        weatherSensitive: true,
        category: 'entertainment',
        prefecture: 'hokkaido'
      }
    ]
  },

  // Hiroshima/Chugoku
  hiroshima: {
    major: [
      {
        id: 'hiroshima-station',
        name: '広島',
        nameEn: 'Hiroshima',
        coords: { latitude: 34.3978, longitude: 132.4751 },
        lines: ['JR Tokaido', 'JR Sanyo', 'Astram'],
        demandLevel: 'high',
        peakHours: ['07:30-09:00', '17:30-19:00'],
        weatherSensitive: true,
        category: 'major_hub',
        prefecture: 'hiroshima'
      }
    ]
  }
};

// Prefecture and region mapping
const PREFECTURE_REGIONS = {
  tokyo: { name: '東京都', region: 'kanto' },
  osaka: { name: '大阪府', region: 'kansai' },
  aichi: { name: '愛知県', region: 'chubu' },
  kyoto: { name: '京都府', region: 'kansai' },
  fukuoka: { name: '福岡県', region: 'kyushu' },
  miyagi: { name: '宮城県', region: 'tohoku' },
  hokkaido: { name: '北海道', region: 'hokkaido' },
  hiroshima: { name: '広島県', region: 'chugoku' }
};

// Weather API endpoints for major cities
const WEATHER_LOCATIONS = {
  tokyo: { lat: 35.6762, lon: 139.7003, name: '東京' },
  osaka: { lat: 34.6937, lon: 135.5023, name: '大阪' },
  nagoya: { lat: 35.1815, lon: 136.9066, name: '名古屋' },
  kyoto: { lat: 35.0116, lon: 135.7681, name: '京都' },
  fukuoka: { lat: 33.5904, lon: 130.4017, name: '福岡' },
  sendai: { lat: 38.2682, lon: 140.8694, name: '仙台' },
  sapporo: { lat: 43.0642, lon: 141.3469, name: '札幌' },
  hiroshima: { lat: 34.3853, lon: 132.4553, name: '広島' }
};

// Function to detect user's region based on location
function detectRegion(userLocation) {
  const regions = {
    tokyo: { center: { lat: 35.6762, lon: 139.7003 }, radius: 50 },
    osaka: { center: { lat: 34.6937, lon: 135.5023 }, radius: 30 },
    nagoya: { center: { lat: 35.1815, lon: 136.9066 }, radius: 25 },
    kyoto: { center: { lat: 35.0116, lon: 135.7681 }, radius: 20 },
    fukuoka: { center: { lat: 33.5904, lon: 130.4017 }, radius: 25 },
    sendai: { center: { lat: 38.2682, lon: 140.8694 }, radius: 20 },
    sapporo: { center: { lat: 43.0642, lon: 141.3469 }, radius: 20 },
    hiroshima: { center: { lat: 34.3853, lon: 132.4553 }, radius: 20 }
  };

  for (const [regionName, regionData] of Object.entries(regions)) {
    const distance = calculateDistance(userLocation, regionData.center);
    if (distance <= regionData.radius) {
      return regionName;
    }
  }
  
  return 'other'; // Rural or small city
}

// Get stations for user's current region
function getStationsForRegion(region) {
  if (JAPAN_STATIONS[region]) {
    return JAPAN_STATIONS[region];
  }
  
  // For areas without specific station data, return nearest major city
  const nearestMajorCity = findNearestMajorCity(region);
  return JAPAN_STATIONS[nearestMajorCity] || JAPAN_STATIONS.tokyo;
}

// Get weather for user's region
function getWeatherLocationForRegion(region) {
  return WEATHER_LOCATIONS[region] || WEATHER_LOCATIONS.tokyo;
}

// Enhanced AI recommendations for nationwide service
function getNationwideAIRecommendations(driverLocation, currentHour, weatherCondition) {
  const userRegion = detectRegion(driverLocation);
  const regionalStations = getStationsForRegion(userRegion);
  
  // Get all stations from the region
  const allStations = Object.values(regionalStations).flat();
  
  // Apply existing logic but with regional data
  const highDemandStations = allStations.filter(station => {
    const timeString = `${currentHour.toString().padStart(2, '0')}:00`;
    return station.peakHours.some(peak => {
      const [start, end] = peak.split('-');
      return timeString >= start && timeString <= end;
    });
  }).slice(0, 3);

  const weatherStations = weatherCondition.rain > 0 
    ? allStations.filter(s => s.weatherSensitive).slice(0, 3)
    : [];

  const nearbyStations = getNearbyStations(driverLocation, 5, allStations).slice(0, 3);

  return {
    region: userRegion,
    highDemand: highDemandStations,
    weatherBased: weatherStations,
    nearby: nearbyStations,
    message: weatherCondition.rain > 0 
      ? `${PREFECTURE_REGIONS[userRegion]?.name || ''}で雨のため駅周辺の需要が増加しています` 
      : `${PREFECTURE_REGIONS[userRegion]?.name || ''}の通常の需要パターンに基づく推奨です`
  };
}

function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.lon - coord1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getNearbyStations(location, radiusKm, stationList) {
  return stationList.filter(station => {
    const distance = calculateDistance(location, station.coords);
    return distance <= radiusKm;
  }).sort((a, b) => {
    const distA = calculateDistance(location, a.coords);
    const distB = calculateDistance(location, b.coords);
    return distA - distB;
  });
}

module.exports = {
  JAPAN_STATIONS,
  PREFECTURE_REGIONS,
  WEATHER_LOCATIONS,
  detectRegion,
  getStationsForRegion,
  getWeatherLocationForRegion,
  getNationwideAIRecommendations,
  getNearbyStations
};
