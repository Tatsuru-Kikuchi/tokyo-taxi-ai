// Complete Japan Station Database - Fixed Version
// Includes all Tokyo stations + nationwide coverage

// Tokyo Stations (Original data that was missing)
const TOKYO_STATIONS = [
  // JR Yamanote Line
  {
    id: 'shibuya',
    name: '渋谷駅',
    nameEn: 'Shibuya',
    lat: 35.6580,
    lon: 139.7016,
    prefecture: '東京都',
    region: 'tokyo',
    lines: ['JR山手線', 'JR埼京線', '東急東横線', '京王井の頭線', '東京メトロ銀座線'],
    category: 'major_hub',
    peakHours: [7, 8, 9, 17, 18, 19, 20],
    demandLevel: 'very_high',
    weatherSensitive: true,
    description: '若者の街、ファッション・エンターテイメントの中心地'
  },
  {
    id: 'shinjuku',
    name: '新宿駅',
    nameEn: 'Shinjuku',
    lat: 35.6896,
    lon: 139.7006,
    prefecture: '東京都',
    region: 'tokyo',
    lines: ['JR山手線', 'JR中央線', '小田急線', '京王線', '東京メトロ丸ノ内線'],
    category: 'major_hub',
    peakHours: [7, 8, 9, 17, 18, 19, 20],
    demandLevel: 'very_high',
    weatherSensitive: true,
    description: '世界最大のターミナル駅、ビジネス・商業の中心地'
  },
  {
    id: 'tokyo',
    name: '東京駅',
    nameEn: 'Tokyo',
    lat: 35.6812,
    lon: 139.7671,
    prefecture: '東京都',
    region: 'tokyo',
    lines: ['JR山手線', 'JR東海道線', 'JR中央線', '東京メトロ丸ノ内線'],
    category: 'major_hub',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'very_high',
    weatherSensitive: true,
    description: '日本の鉄道の中心駅、皇居最寄り駅'
  },
  {
    id: 'ikebukuro',
    name: '池袋駅',
    nameEn: 'Ikebukuro',
    lat: 35.7295,
    lon: 139.7109,
    prefecture: '東京都',
    region: 'tokyo',
    lines: ['JR山手線', 'JR埼京線', '東武東上線', '西武池袋線'],
    category: 'major_hub',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'very_high',
    weatherSensitive: true,
    description: '北東京のターミナル駅、サブカルチャーの聖地'
  },
  {
    id: 'ginza',
    name: '銀座駅',
    nameEn: 'Ginza',
    lat: 35.6719,
    lon: 139.7648,
    prefecture: '東京都',
    region: 'tokyo',
    lines: ['東京メトロ銀座線', '東京メトロ丸ノ内線', '東京メトロ日比谷線'],
    category: 'business',
    peakHours: [11, 12, 13, 14, 15, 18, 19, 20],
    demandLevel: 'high',
    weatherSensitive: true,
    description: '高級ショッピング・グルメの中心地'
  },
  {
    id: 'harajuku',
    name: '原宿駅',
    nameEn: 'Harajuku',
    lat: 35.6702,
    lon: 139.7026,
    prefecture: '東京都',
    region: 'tokyo',
    lines: ['JR山手線'],
    category: 'entertainment',
    peakHours: [10, 11, 12, 13, 14, 15, 16],
    demandLevel: 'high',
    weatherSensitive: true,
    description: 'カワイイカルチャーの発信地、明治神宮最寄り'
  },
  {
    id: 'roppongi',
    name: '六本木駅',
    nameEn: 'Roppongi',
    lat: 35.6627,
    lon: 139.7314,
    prefecture: '東京都',
    region: 'tokyo',
    lines: ['東京メトロ日比谷線', '都営大江戸線'],
    category: 'entertainment',
    peakHours: [19, 20, 21, 22, 23, 24, 1, 2],
    demandLevel: 'high',
    weatherSensitive: false,
    description: '国際的なナイトライフ・エンターテイメント地区'
  },
  {
    id: 'ueno',
    name: '上野駅',
    nameEn: 'Ueno',
    lat: 35.7139,
    lon: 139.7774,
    prefecture: '東京都',
    region: 'tokyo',
    lines: ['JR山手線', 'JR京浜東北線', '東京メトロ銀座線', '東京メトロ日比谷線'],
    category: 'tourist',
    peakHours: [9, 10, 11, 14, 15, 16],
    demandLevel: 'medium',
    weatherSensitive: true,
    description: '上野動物園・美術館群の最寄り駅'
  },
  {
    id: 'akihabara',
    name: '秋葉原駅',
    nameEn: 'Akihabara',
    lat: 35.6984,
    lon: 139.7731,
    prefecture: '東京都',
    region: 'tokyo',
    lines: ['JR山手線', 'JR京浜東北線', '東京メトロ日比谷線', 'つくばエクスプレス'],
    category: 'entertainment',
    peakHours: [10, 11, 12, 13, 14, 15, 16, 17],
    demandLevel: 'medium',
    weatherSensitive: true,
    description: '電気街・オタク文化の聖地'
  },
  {
    id: 'shinagawa',
    name: '品川駅',
    nameEn: 'Shinagawa',
    lat: 35.6287,
    lon: 139.7390,
    prefecture: '東京都',
    region: 'tokyo',
    lines: ['JR山手線', 'JR東海道線', '京急本線'],
    category: 'business',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'high',
    weatherSensitive: false,
    description: '新幹線南の玄関口、ビジネス地区'
  },
  {
    id: 'haneda',
    name: '羽田空港',
    nameEn: 'Haneda Airport',
    lat: 35.5494,
    lon: 139.7798,
    prefecture: '東京都',
    region: 'tokyo',
    lines: ['東京モノレール', '京急空港線'],
    category: 'airport',
    peakHours: [5, 6, 7, 8, 9, 17, 18, 19, 20, 21, 22],
    demandLevel: 'very_high',
    weatherSensitive: true,
    description: '国内線の中心空港'
  },
  {
    id: 'narita',
    name: '成田空港',
    nameEn: 'Narita Airport',
    lat: 35.7720,
    lon: 140.3929,
    prefecture: '千葉県',
    region: 'tokyo',
    lines: ['JR成田エクスプレス', '京成スカイライナー'],
    category: 'airport',
    peakHours: [5, 6, 7, 8, 9, 17, 18, 19, 20, 21, 22],
    demandLevel: 'very_high',
    weatherSensitive: true,
    description: '国際線の中心空港'
  }
];

// Other Major Cities Stations
const OSAKA_STATIONS = [
  {
    id: 'osaka_main',
    name: '大阪駅',
    nameEn: 'Osaka',
    lat: 34.7024,
    lon: 135.4959,
    prefecture: '大阪府',
    region: 'osaka',
    lines: ['JR東海道本線', 'JR大阪環状線', 'JR福知山線'],
    category: 'major_hub',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'very_high',
    weatherSensitive: true,
    description: '関西最大のターミナル駅'
  },
  {
    id: 'namba',
    name: '難波駅',
    nameEn: 'Namba',
    lat: 34.6687,
    lon: 135.5017,
    prefecture: '大阪府',
    region: 'osaka',
    lines: ['南海本線', '近鉄奈良線', '阪神なんば線'],
    category: 'entertainment',
    peakHours: [18, 19, 20, 21, 22],
    demandLevel: 'high',
    weatherSensitive: false,
    description: '大阪の繁華街、道頓堀最寄り'
  },
  {
    id: 'tennoji',
    name: '天王寺駅',
    nameEn: 'Tennoji',
    lat: 34.6455,
    lon: 135.5066,
    prefecture: '大阪府',
    region: 'osaka',
    lines: ['JR大阪環状線', '近鉄南大阪線', '大阪メトロ御堂筋線'],
    category: 'major_hub',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'high',
    weatherSensitive: true,
    description: '南大阪のターミナル駅'
  },
  {
    id: 'shinsaibashi',
    name: '心斎橋駅',
    nameEn: 'Shinsaibashi',
    lat: 34.6745,
    lon: 135.5011,
    prefecture: '大阪府',
    region: 'osaka',
    lines: ['大阪メトロ御堂筋線', '大阪メトロ長堀鶴見緑地線'],
    category: 'business',
    peakHours: [11, 12, 13, 14, 15, 18, 19, 20],
    demandLevel: 'high',
    weatherSensitive: true,
    description: 'ショッピング・ファッションの中心地'
  }
];

const NAGOYA_STATIONS = [
  {
    id: 'nagoya_main',
    name: '名古屋駅',
    nameEn: 'Nagoya',
    lat: 35.1706,
    lon: 136.8816,
    prefecture: '愛知県',
    region: 'nagoya',
    lines: ['JR東海道本線', 'JR中央本線', '近鉄名古屋線', '名鉄名古屋本線'],
    category: 'major_hub',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'very_high',
    weatherSensitive: true,
    description: '中部地方最大のターミナル駅'
  },
  {
    id: 'sakae',
    name: '栄駅',
    nameEn: 'Sakae',
    lat: 35.1710,
    lon: 136.9066,
    prefecture: '愛知県',
    region: 'nagoya',
    lines: ['名古屋市営地下鉄東山線', '名古屋市営地下鉄名城線'],
    category: 'business',
    peakHours: [11, 12, 13, 14, 15, 18, 19, 20],
    demandLevel: 'high',
    weatherSensitive: true,
    description: '名古屋の繁華街・商業地区の中心'
  },
  {
    id: 'kanayama',
    name: '金山駅',
    nameEn: 'Kanayama',
    lat: 35.1439,
    lon: 136.9003,
    prefecture: '愛知県',
    region: 'nagoya',
    lines: ['JR東海道本線', 'JR中央本線', '名鉄名古屋本線'],
    category: 'transport_hub',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'high',
    weatherSensitive: true,
    description: '名古屋南部のターミナル駅'
  },
  {
    id: 'ozone',
    name: '大曽根駅',
    nameEn: 'Ozone',
    lat: 35.1836,
    lon: 136.9269,
    prefecture: '愛知県',
    region: 'nagoya',
    lines: ['JR中央本線', '名鉄瀬戸線', '名古屋市営地下鉄名城線'],
    category: 'transport_hub',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'medium',
    weatherSensitive: false,
    description: '名古屋北東部の交通要衝'
  }
];

const KYOTO_STATIONS = [
  {
    id: 'kyoto_main',
    name: '京都駅',
    nameEn: 'Kyoto',
    lat: 34.9858,
    lon: 135.7581,
    prefecture: '京都府',
    region: 'kyoto',
    lines: ['JR東海道本線', 'JR奈良線', '近鉄京都線', '京都市営地下鉄烏丸線'],
    category: 'major_hub',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'very_high',
    weatherSensitive: true,
    description: '古都京都の玄関口'
  },
  {
    id: 'gion_shijo',
    name: '祇園四条駅',
    nameEn: 'Gion-Shijo',
    lat: 35.0036,
    lon: 135.7706,
    prefecture: '京都府',
    region: 'kyoto',
    lines: ['京阪本線'],
    category: 'tourist',
    peakHours: [10, 11, 12, 13, 14, 15, 16],
    demandLevel: 'high',
    weatherSensitive: true,
    description: '祇園・花見小路の最寄り駅'
  }
];

const FUKUOKA_STATIONS = [
  {
    id: 'hakata',
    name: '博多駅',
    nameEn: 'Hakata',
    lat: 33.5904,
    lon: 130.4017,
    prefecture: '福岡県',
    region: 'fukuoka',
    lines: ['JR鹿児島本線', 'JR博多南線', '福岡市地下鉄空港線'],
    category: 'major_hub',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'very_high',
    weatherSensitive: true,
    description: '九州最大のターミナル駅'
  },
  {
    id: 'tenjin',
    name: '天神駅',
    nameEn: 'Tenjin',
    lat: 33.5908,
    lon: 130.3992,
    prefecture: '福岡県',
    region: 'fukuoka',
    lines: ['福岡市地下鉄空港線', '西鉄天神大牟田線'],
    category: 'business',
    peakHours: [11, 12, 13, 14, 15, 18, 19, 20],
    demandLevel: 'high',
    weatherSensitive: true,
    description: '福岡の商業・繁華街の中心'
  }
];

const SAPPORO_STATIONS = [
  {
    id: 'sapporo',
    name: '札幌駅',
    nameEn: 'Sapporo',
    lat: 43.0686,
    lon: 141.3506,
    prefecture: '北海道',
    region: 'sapporo',
    lines: ['JR函館本線', 'JR千歳線', '札幌市営地下鉄南北線'],
    category: 'major_hub',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'very_high',
    weatherSensitive: true,
    description: '北海道最大のターミナル駅'
  },
  {
    id: 'susukino',
    name: 'すすきの駅',
    nameEn: 'Susukino',
    lat: 43.0546,
    lon: 141.3533,
    prefecture: '北海道',
    region: 'sapporo',
    lines: ['札幌市営地下鉄南北線'],
    category: 'entertainment',
    peakHours: [19, 20, 21, 22, 23, 24],
    demandLevel: 'high',
    weatherSensitive: false,
    description: '北海道最大の歓楽街'
  }
];

const SENDAI_STATIONS = [
  {
    id: 'sendai',
    name: '仙台駅',
    nameEn: 'Sendai',
    lat: 38.2606,
    lon: 140.8819,
    prefecture: '宮城県',
    region: 'sendai',
    lines: ['JR東北本線', 'JR仙石線', '仙台市地下鉄南北線'],
    category: 'major_hub',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'high',
    weatherSensitive: true,
    description: '東北地方最大のターミナル駅'
  }
];

const HIROSHIMA_STATIONS = [
  {
    id: 'hiroshima',
    name: '広島駅',
    nameEn: 'Hiroshima',
    lat: 34.3978,
    lon: 132.4757,
    prefecture: '広島県',
    region: 'hiroshima',
    lines: ['JR山陽本線', 'JR呉線', '広島電鉄'],
    category: 'major_hub',
    peakHours: [7, 8, 9, 17, 18, 19],
    demandLevel: 'high',
    weatherSensitive: true,
    description: '中国地方最大のターミナル駅'
  }
];

// Combine all stations
const ALL_JAPAN_STATIONS = [
  ...TOKYO_STATIONS,
  ...OSAKA_STATIONS,
  ...NAGOYA_STATIONS,
  ...KYOTO_STATIONS,
  ...FUKUOKA_STATIONS,
  ...SAPPORO_STATIONS,
  ...SENDAI_STATIONS,
  ...HIROSHIMA_STATIONS
];

// Region mapping for easy access
const REGIONS = {
  tokyo: {
    name: '東京都',
    nameEn: 'Tokyo',
    stations: TOKYO_STATIONS,
    mainStation: 'tokyo',
    weather: 'tokyo'
  },
  osaka: {
    name: '大阪府',
    nameEn: 'Osaka',
    stations: OSAKA_STATIONS,
    mainStation: 'osaka_main',
    weather: 'osaka'
  },
  nagoya: {
    name: '愛知県',
    nameEn: 'Nagoya',
    stations: NAGOYA_STATIONS,
    mainStation: 'nagoya_main',
    weather: 'nagoya'
  },
  kyoto: {
    name: '京都府',
    nameEn: 'Kyoto',
    stations: KYOTO_STATIONS,
    mainStation: 'kyoto_main',
    weather: 'kyoto'
  },
  fukuoka: {
    name: '福岡県',
    nameEn: 'Fukuoka',
    stations: FUKUOKA_STATIONS,
    mainStation: 'hakata',
    weather: 'fukuoka'
  },
  sapporo: {
    name: '北海道',
    nameEn: 'Sapporo',
    stations: SAPPORO_STATIONS,
    mainStation: 'sapporo',
    weather: 'sapporo'
  },
  sendai: {
    name: '宮城県',
    nameEn: 'Sendai',
    stations: SENDAI_STATIONS,
    mainStation: 'sendai',
    weather: 'sendai'
  },
  hiroshima: {
    name: '広島県',
    nameEn: 'Hiroshima',
    stations: HIROSHIMA_STATIONS,
    mainStation: 'hiroshima',
    weather: 'hiroshima'
  }
};

// Helper functions
const getStationsByRegion = (region) => {
  return REGIONS[region]?.stations || [];
};

const getRegionByCoordinates = (lat, lon) => {
  // Simple distance-based region detection
  const distances = Object.entries(REGIONS).map(([regionKey, regionData]) => {
    const mainStation = regionData.stations.find(s => s.id === regionData.mainStation);
    if (!mainStation) return { region: regionKey, distance: Infinity };
    
    const distance = Math.sqrt(
      Math.pow(lat - mainStation.lat, 2) + Math.pow(lon - mainStation.lon, 2)
    );
    return { region: regionKey, distance };
  });
  
  const closest = distances.reduce((min, current) => 
    current.distance < min.distance ? current : min
  );
  
  return closest.region;
};

const getNearbyStations = (lat, lon, radius = 0.1) => {
  return ALL_JAPAN_STATIONS.filter(station => {
    const distance = Math.sqrt(
      Math.pow(lat - station.lat, 2) + Math.pow(lon - station.lon, 2)
    );
    return distance <= radius;
  });
};

module.exports = {
  ALL_JAPAN_STATIONS,
  TOKYO_STATIONS,
  OSAKA_STATIONS,
  NAGOYA_STATIONS,
  KYOTO_STATIONS,
  FUKUOKA_STATIONS,
  SAPPORO_STATIONS,
  SENDAI_STATIONS,
  HIROSHIMA_STATIONS,
  REGIONS,
  getStationsByRegion,
  getRegionByCoordinates,
  getNearbyStations
};
