// tokyo-stations.js - Complete Tokyo Station Database
const TOKYO_STATIONS = {
  // JR Yamanote Line (山手線)
  yamanote: [
    {
      id: 'shibuya',
      name: '渋谷',
      nameEn: 'Shibuya',
      coords: { latitude: 35.6580, longitude: 139.7016 },
      lines: ['JR Yamanote', 'JR Saikyo', 'JR Shonan-Shinjuku', 'Tokyo Metro Ginza', 'Tokyo Metro Hanzomon', 'Tokyo Metro Fukutoshin', 'Keio Inokashira', 'Tokyu Den-en-toshi', 'Tokyu Toyoko'],
      demandLevel: 'very_high',
      peakHours: ['07:00-09:00', '17:00-20:00'],
      weatherSensitive: true,
      category: 'major_hub'
    },
    {
      id: 'shinjuku',
      name: '新宿',
      nameEn: 'Shinjuku',
      coords: { latitude: 35.6896, longitude: 139.7006 },
      lines: ['JR Yamanote', 'JR Chuo', 'JR Sobu', 'JR Saikyo', 'JR Shonan-Shinjuku', 'Tokyo Metro Marunouchi', 'Tokyo Metro Fukutoshin', 'Tokyo Metro Shinjuku', 'Keio', 'Odakyu'],
      demandLevel: 'very_high',
      peakHours: ['07:00-09:30', '17:00-21:00'],
      weatherSensitive: true,
      category: 'major_hub'
    },
    {
      id: 'ikebukuro',
      name: '池袋',
      nameEn: 'Ikebukuro',
      coords: { latitude: 35.7295, longitude: 139.7109 },
      lines: ['JR Yamanote', 'JR Saikyo', 'JR Shonan-Shinjuku', 'Tokyo Metro Marunouchi', 'Tokyo Metro Yurakucho', 'Tokyo Metro Fukutoshin', 'Seibu Ikebukuro', 'Tobu Tojo'],
      demandLevel: 'very_high',
      peakHours: ['07:30-09:30', '17:30-20:00'],
      weatherSensitive: true,
      category: 'major_hub'
    },
    {
      id: 'tokyo',
      name: '東京',
      nameEn: 'Tokyo',
      coords: { latitude: 35.6812, longitude: 139.7671 },
      lines: ['JR Yamanote', 'JR Keihin-Tohoku', 'JR Tokaido', 'JR Chuo', 'Tokyo Metro Marunouchi'],
      demandLevel: 'very_high',
      peakHours: ['07:00-09:00', '17:00-19:00'],
      weatherSensitive: true,
      category: 'major_hub'
    },
    {
      id: 'yurakucho',
      name: '有楽町',
      nameEn: 'Yurakucho',
      coords: { latitude: 35.6751, longitude: 139.7634 },
      lines: ['JR Yamanote', 'JR Keihin-Tohoku', 'Tokyo Metro Yurakucho'],
      demandLevel: 'high',
      peakHours: ['08:00-09:00', '18:00-20:00'],
      weatherSensitive: true,
      category: 'business'
    },
    {
      id: 'shimbashi',
      name: '新橋',
      nameEn: 'Shimbashi',
      coords: { latitude: 35.6658, longitude: 139.7583 },
      lines: ['JR Yamanote', 'JR Keihin-Tohoku', 'JR Tokaido', 'Tokyo Metro Ginza', 'Toei Asakusa', 'Yurikamome'],
      demandLevel: 'very_high',
      peakHours: ['08:00-09:30', '18:00-21:00'],
      weatherSensitive: true,
      category: 'business'
    },
    {
      id: 'hamamatsucho',
      name: '浜松町',
      nameEn: 'Hamamatsucho',
      coords: { latitude: 35.6550, longitude: 139.7574 },
      lines: ['JR Yamanote', 'JR Keihin-Tohoku', 'Tokyo Monorail'],
      demandLevel: 'high',
      peakHours: ['07:30-09:00', '17:30-19:30'],
      weatherSensitive: true,
      category: 'business'
    },
    {
      id: 'tamachi',
      name: '田町',
      nameEn: 'Tamachi',
      coords: { latitude: 35.6456, longitude: 139.7477 },
      lines: ['JR Yamanote', 'JR Keihin-Tohoku'],
      demandLevel: 'medium',
      peakHours: ['08:00-09:00', '18:00-19:30'],
      weatherSensitive: false,
      category: 'residential'
    },
    {
      id: 'shinagawa',
      name: '品川',
      nameEn: 'Shinagawa',
      coords: { latitude: 35.6284, longitude: 139.7387 },
      lines: ['JR Yamanote', 'JR Keihin-Tohoku', 'JR Tokaido', 'Keikyu'],
      demandLevel: 'very_high',
      peakHours: ['07:00-09:00', '17:00-19:00'],
      weatherSensitive: true,
      category: 'major_hub'
    },
    {
      id: 'osaki',
      name: '大崎',
      nameEn: 'Osaki',
      coords: { latitude: 35.6197, longitude: 139.7286 },
      lines: ['JR Yamanote', 'JR Saikyo', 'JR Shonan-Shinjuku', 'Rinkai'],
      demandLevel: 'medium',
      peakHours: ['08:00-09:00', '18:00-19:30'],
      weatherSensitive: false,
      category: 'business'
    },
    {
      id: 'gotanda',
      name: '五反田',
      nameEn: 'Gotanda',
      coords: { latitude: 35.6258, longitude: 139.7238 },
      lines: ['JR Yamanote', 'Toei Asakusa', 'Tokyu Ikegami'],
      demandLevel: 'medium',
      peakHours: ['08:00-09:00', '18:00-20:00'],
      weatherSensitive: false,
      category: 'business'
    },
    {
      id: 'meguro',
      name: '目黒',
      nameEn: 'Meguro',
      coords: { latitude: 35.6334, longitude: 139.7156 },
      lines: ['JR Yamanote', 'Tokyo Metro Namboku', 'Toei Mita', 'Tokyu Meguro'],
      demandLevel: 'medium',
      peakHours: ['08:00-09:00', '18:00-19:30'],
      weatherSensitive: false,
      category: 'residential'
    },
    {
      id: 'ebisu',
      name: '恵比寿',
      nameEn: 'Ebisu',
      coords: { latitude: 35.6465, longitude: 139.7100 },
      lines: ['JR Yamanote', 'JR Saikyo', 'JR Shonan-Shinjuku', 'Tokyo Metro Hibiya'],
      demandLevel: 'high',
      peakHours: ['08:00-09:00', '18:00-21:00'],
      weatherSensitive: true,
      category: 'entertainment'
    },
    {
      id: 'harajuku',
      name: '原宿',
      nameEn: 'Harajuku',
      coords: { latitude: 35.6702, longitude: 139.7026 },
      lines: ['JR Yamanote'],
      demandLevel: 'high',
      peakHours: ['10:00-12:00', '14:00-18:00'],
      weatherSensitive: true,
      category: 'entertainment'
    },
    {
      id: 'yoyogi',
      name: '代々木',
      nameEn: 'Yoyogi',
      coords: { latitude: 35.6830, longitude: 139.7020 },
      lines: ['JR Yamanote', 'JR Sobu', 'Toei Oedo'],
      demandLevel: 'medium',
      peakHours: ['08:00-09:00', '18:00-19:30'],
      weatherSensitive: false,
      category: 'residential'
    }
  ],

  // Tokyo Metro Major Stations
  metro: [
    {
      id: 'ginza',
      name: '銀座',
      nameEn: 'Ginza',
      coords: { latitude: 35.6717, longitude: 139.7640 },
      lines: ['Tokyo Metro Ginza', 'Tokyo Metro Hibiya', 'Tokyo Metro Marunouchi'],
      demandLevel: 'very_high',
      peakHours: ['10:00-12:00', '14:00-17:00', '19:00-22:00'],
      weatherSensitive: true,
      category: 'shopping'
    },
    {
      id: 'omotesando',
      name: '表参道',
      nameEn: 'Omotesando',
      coords: { latitude: 35.6657, longitude: 139.7128 },
      lines: ['Tokyo Metro Ginza', 'Tokyo Metro Chiyoda', 'Tokyo Metro Hanzomon'],
      demandLevel: 'high',
      peakHours: ['11:00-14:00', '16:00-19:00'],
      weatherSensitive: true,
      category: 'shopping'
    },
    {
      id: 'aoyama-itchome',
      name: '青山一丁目',
      nameEn: 'Aoyama-itchome',
      coords: { latitude: 35.6726, longitude: 139.7241 },
      lines: ['Tokyo Metro Ginza', 'Tokyo Metro Hanzomon', 'Toei Oedo'],
      demandLevel: 'medium',
      peakHours: ['08:00-09:00', '18:00-19:30'],
      weatherSensitive: false,
      category: 'business'
    },
    {
      id: 'akasaka-mitsuke',
      name: '赤坂見附',
      nameEn: 'Akasaka-mitsuke',
      coords: { latitude: 35.6794, longitude: 139.7370 },
      lines: ['Tokyo Metro Ginza', 'Tokyo Metro Marunouchi'],
      demandLevel: 'high',
      peakHours: ['08:00-09:00', '18:00-20:00'],
      weatherSensitive: false,
      category: 'business'
    },
    {
      id: 'roppongi',
      name: '六本木',
      nameEn: 'Roppongi',
      coords: { latitude: 35.6627, longitude: 139.7314 },
      lines: ['Tokyo Metro Hibiya', 'Toei Oedo'],
      demandLevel: 'very_high',
      peakHours: ['19:00-02:00', '12:00-15:00'],
      weatherSensitive: true,
      category: 'entertainment'
    },
    {
      id: 'toranomon',
      name: '虎ノ門',
      nameEn: 'Toranomon',
      coords: { latitude: 35.6691, longitude: 139.7510 },
      lines: ['Tokyo Metro Ginza'],
      demandLevel: 'high',
      peakHours: ['08:00-09:00', '18:00-19:30'],
      weatherSensitive: false,
      category: 'business'
    },
    {
      id: 'kasumigaseki',
      name: '霞ヶ関',
      nameEn: 'Kasumigaseki',
      coords: { latitude: 35.6739, longitude: 139.7543 },
      lines: ['Tokyo Metro Hibiya', 'Tokyo Metro Chiyoda', 'Tokyo Metro Marunouchi'],
      demandLevel: 'high',
      peakHours: ['08:00-09:00', '18:00-19:30'],
      weatherSensitive: false,
      category: 'government'
    },
    {
      id: 'nihonbashi',
      name: '日本橋',
      nameEn: 'Nihonbashi',
      coords: { latitude: 35.6838, longitude: 139.7744 },
      lines: ['Tokyo Metro Ginza', 'Tokyo Metro Tozai', 'Toei Asakusa'],
      demandLevel: 'high',
      peakHours: ['08:00-09:00', '18:00-19:30'],
      weatherSensitive: false,
      category: 'business'
    },
    {
      id: 'otemachi',
      name: '大手町',
      nameEn: 'Otemachi',
      coords: { latitude: 35.6847, longitude: 139.7663 },
      lines: ['Tokyo Metro Chiyoda', 'Tokyo Metro Hanzomon', 'Tokyo Metro Marunouchi', 'Tokyo Metro Tozai', 'Toei Mita'],
      demandLevel: 'very_high',
      peakHours: ['07:30-09:00', '17:30-19:00'],
      weatherSensitive: false,
      category: 'business'
    },
    {
      id: 'akihabara',
      name: '秋葉原',
      nameEn: 'Akihabara',
      coords: { latitude: 35.6984, longitude: 139.7731 },
      lines: ['JR Yamanote', 'JR Keihin-Tohoku', 'JR Sobu', 'Tokyo Metro Hibiya', 'Tsukuba Express'],
      demandLevel: 'high',
      peakHours: ['10:00-12:00', '14:00-18:00'],
      weatherSensitive: true,
      category: 'entertainment'
    },
    {
      id: 'ueno',
      name: '上野',
      nameEn: 'Ueno',
      coords: { latitude: 35.7138, longitude: 139.7774 },
      lines: ['JR Yamanote', 'JR Keihin-Tohoku', 'JR Utsunomiya', 'JR Takasaki', 'Tokyo Metro Ginza', 'Tokyo Metro Hibiya'],
      demandLevel: 'high',
      peakHours: ['09:00-11:00', '14:00-17:00'],
      weatherSensitive: true,
      category: 'cultural'
    },
    {
      id: 'asakusa',
      name: '浅草',
      nameEn: 'Asakusa',
      coords: { latitude: 35.7121, longitude: 139.7946 },
      lines: ['Tokyo Metro Ginza', 'Toei Asakusa', 'Tobu Skytree'],
      demandLevel: 'high',
      peakHours: ['09:00-12:00', '14:00-17:00'],
      weatherSensitive: true,
      category: 'tourist'
    }
  ],

  // Airport Connections
  airports: [
    {
      id: 'haneda',
      name: '羽田空港',
      nameEn: 'Haneda Airport',
      coords: { latitude: 35.5494, longitude: 139.7798 },
      lines: ['Tokyo Monorail', 'Keikyu Airport'],
      demandLevel: 'very_high',
      peakHours: ['05:00-09:00', '17:00-23:00'],
      weatherSensitive: true,
      category: 'airport'
    },
    {
      id: 'narita',
      name: '成田空港',
      nameEn: 'Narita Airport',
      coords: { latitude: 35.7720, longitude: 140.3929 },
      lines: ['Keisei Skyliner', 'JR Narita Express'],
      demandLevel: 'very_high',
      peakHours: ['05:00-09:00', '17:00-23:00'],
      weatherSensitive: true,
      category: 'airport'
    }
  ]
};

// Function to get nearby stations
function getNearbyStations(location, radiusKm = 2) {
  const allStations = [
    ...TOKYO_STATIONS.yamanote,
    ...TOKYO_STATIONS.metro,
    ...TOKYO_STATIONS.airports
  ];

  return allStations.filter(station => {
    const distance = calculateDistance(location, station.coords);
    return distance <= radiusKm;
  }).sort((a, b) => {
    const distA = calculateDistance(location, a.coords);
    const distB = calculateDistance(location, b.coords);
    return distA - distB;
  });
}

// Function to get high-demand stations for current time
function getHighDemandStations(currentHour) {
  const allStations = [
    ...TOKYO_STATIONS.yamanote,
    ...TOKYO_STATIONS.metro,
    ...TOKYO_STATIONS.airports
  ];

  return allStations.filter(station => {
    const timeString = `${currentHour.toString().padStart(2, '0')}:00`;
    return station.peakHours.some(peak => {
      const [start, end] = peak.split('-');
      return timeString >= start && timeString <= end;
    });
  }).sort((a, b) => {
    const demandOrder = { 'very_high': 4, 'high': 3, 'medium': 2, 'low': 1 };
    return demandOrder[b.demandLevel] - demandOrder[a.demandLevel];
  });
}

// Function to get weather-sensitive stations
function getWeatherSensitiveStations(isRaining = false) {
  const allStations = [
    ...TOKYO_STATIONS.yamanote,
    ...TOKYO_STATIONS.metro,
    ...TOKYO_STATIONS.airports
  ];

  return allStations.filter(station => station.weatherSensitive && isRaining);
}

// Function for AI recommendations
function getAIRecommendations(driverLocation, currentHour, weatherCondition) {
  const recommendations = [];
  
  // Get high-demand stations for current time
  const highDemandStations = getHighDemandStations(currentHour).slice(0, 3);
  
  // Get weather-sensitive stations if raining
  let weatherStations = [];
  if (weatherCondition.rain > 0) {
    weatherStations = getWeatherSensitiveStations(true).slice(0, 3);
  }
  
  // Get nearby stations
  const nearbyStations = getNearbyStations(driverLocation, 5).slice(0, 3);
  
  return {
    highDemand: highDemandStations,
    weatherBased: weatherStations,
    nearby: nearbyStations,
    message: weatherCondition.rain > 0 
      ? '雨のため駅周辺の需要が増加しています' 
      : '通常の需要パターンに基づく推奨です'
  };
}

function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = {
  TOKYO_STATIONS,
  getNearbyStations,
  getHighDemandStations,
  getWeatherSensitiveStations,
  getAIRecommendations
};
