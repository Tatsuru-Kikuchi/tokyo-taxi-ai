// utils/station_mapping.js
// Maps station names to ODPT railway IDs for train delay checking

const STATION_TO_LINES = {
  // Major Tokyo Stations
  "東京": [
    "odpt.Railway:JR-East.Yamanote",
    "odpt.Railway:JR-East.Keihin-Tohoku",
    "odpt.Railway:JR-East.Tokaido",
    "odpt.Railway:JR-East.ChuoRapid",
    "odpt.Railway:JR-East.Yokosuka",
    "odpt.Railway:JR-East.Sobu",
    "odpt.Railway:TokyoMetro.Marunouchi"
  ],
  "新宿": [
    "odpt.Railway:JR-East.Yamanote",
    "odpt.Railway:JR-East.ChuoRapid",
    "odpt.Railway:JR-East.Sobu",
    "odpt.Railway:JR-East.Shonan-Shinjuku",
    "odpt.Railway:TokyoMetro.Marunouchi",
    "odpt.Railway:TokyoMetro.Fukutoshin",
    "odpt.Railway:Toei.Shinjuku",
    "odpt.Railway:Toei.Oedo"
  ],
  "渋谷": [
    "odpt.Railway:JR-East.Yamanote",
    "odpt.Railway:JR-East.Shonan-Shinjuku",
    "odpt.Railway:TokyoMetro.Ginza",
    "odpt.Railway:TokyoMetro.Hanzomon",
    "odpt.Railway:TokyoMetro.Fukutoshin",
    "odpt.Railway:Tokyu.Toyoko",
    "odpt.Railway:Tokyu.Den-en-toshi"
  ],
  "品川": [
    "odpt.Railway:JR-East.Yamanote",
    "odpt.Railway:JR-East.Keihin-Tohoku",
    "odpt.Railway:JR-East.Tokaido",
    "odpt.Railway:JR-East.Yokosuka",
    "odpt.Railway:Keikyu.Main"
  ],
  "池袋": [
    "odpt.Railway:JR-East.Yamanote",
    "odpt.Railway:JR-East.Shonan-Shinjuku",
    "odpt.Railway:TokyoMetro.Marunouchi",
    "odpt.Railway:TokyoMetro.Yurakucho",
    "odpt.Railway:TokyoMetro.Fukutoshin",
    "odpt.Railway:Tobu.Tojo",
    "odpt.Railway:Seibu.Ikebukuro"
  ],
  "上野": [
    "odpt.Railway:JR-East.Yamanote",
    "odpt.Railway:JR-East.Keihin-Tohoku",
    "odpt.Railway:JR-East.Utsunomiya",
    "odpt.Railway:JR-East.Takasaki",
    "odpt.Railway:TokyoMetro.Ginza",
    "odpt.Railway:TokyoMetro.Hibiya"
  ],
  "秋葉原": [
    "odpt.Railway:JR-East.Yamanote",
    "odpt.Railway:JR-East.Keihin-Tohoku",
    "odpt.Railway:JR-East.Sobu",
    "odpt.Railway:TokyoMetro.Hibiya",
    "odpt.Railway:TsukubaExpress"
  ],
  "新橋": [
    "odpt.Railway:JR-East.Yamanote",
    "odpt.Railway:JR-East.Keihin-Tohoku",
    "odpt.Railway:JR-East.Tokaido",
    "odpt.Railway:TokyoMetro.Ginza",
    "odpt.Railway:Toei.Asakusa",
    "odpt.Railway:Yurikamome"
  ],
  "浜松町": [
    "odpt.Railway:JR-East.Yamanote",
    "odpt.Railway:JR-East.Keihin-Tohoku",
    "odpt.Railway:TokyoMonorail.Haneda"
  ],
  "恵比寿": [
    "odpt.Railway:JR-East.Yamanote",
    "odpt.Railway:JR-East.Shonan-Shinjuku",
    "odpt.Railway:TokyoMetro.Hibiya"
  ],
  
  // Major Osaka Stations
  "大阪": [
    "odpt.Railway:JR-West.OsakaLoop",
    "odpt.Railway:JR-West.Tokaido",
    "odpt.Railway:JR-West.Fukuchiyama",
    "odpt.Railway:OsakaMetro.Midosuji",
    "odpt.Railway:OsakaMetro.Tanimachi",
    "odpt.Railway:OsakaMetro.Yotsubashi"
  ],
  "梅田": [
    "odpt.Railway:OsakaMetro.Midosuji",
    "odpt.Railway:OsakaMetro.Tanimachi",
    "odpt.Railway:OsakaMetro.Yotsubashi",
    "odpt.Railway:Hankyu.Kobe",
    "odpt.Railway:Hankyu.Takarazuka",
    "odpt.Railway:Hankyu.Kyoto",
    "odpt.Railway:Hanshin.Main"
  ],
  "難波": [
    "odpt.Railway:OsakaMetro.Midosuji",
    "odpt.Railway:OsakaMetro.Yotsubashi",
    "odpt.Railway:OsakaMetro.Sennichimae",
    "odpt.Railway:Nankai.Main",
    "odpt.Railway:Kintetsu.Namba"
  ],
  "天王寺": [
    "odpt.Railway:JR-West.OsakaLoop",
    "odpt.Railway:JR-West.Hanwa",
    "odpt.Railway:JR-West.Yamatoji",
    "odpt.Railway:OsakaMetro.Midosuji",
    "odpt.Railway:OsakaMetro.Tanimachi"
  ],
  "新大阪": [
    "odpt.Railway:JR-West.Tokaido",
    "odpt.Railway:JR-West.Sanyo",
    "odpt.Railway:OsakaMetro.Midosuji"
  ],
  
  // Major Yokohama Stations
  "横浜": [
    "odpt.Railway:JR-East.Tokaido",
    "odpt.Railway:JR-East.Yokosuka",
    "odpt.Railway:JR-East.Keihin-Tohoku",
    "odpt.Railway:JR-East.Yokohama",
    "odpt.Railway:Tokyu.Toyoko",
    "odpt.Railway:Keikyu.Main",
    "odpt.Railway:Sotetsu.Main",
    "odpt.Railway:YokohamaMinatomiraiRailway.Minatomirai"
  ],
  "桜木町": [
    "odpt.Railway:JR-East.Keihin-Tohoku",
    "odpt.Railway:YokohamaMinatomiraiRailway.Minatomirai"
  ],
  
  // Major Nagoya Stations
  "名古屋": [
    "odpt.Railway:JR-Central.Tokaido",
    "odpt.Railway:JR-Central.Chuo",
    "odpt.Railway:NagoyaMunicipal.Higashiyama",
    "odpt.Railway:NagoyaMunicipal.Sakuradori",
    "odpt.Railway:Meitetsu.NagoyaMain",
    "odpt.Railway:Kintetsu.Nagoya"
  ],
  "栄": [
    "odpt.Railway:NagoyaMunicipal.Higashiyama",
    "odpt.Railway:NagoyaMunicipal.Meijo"
  ],
  
  // Major Kyoto Stations
  "京都": [
    "odpt.Railway:JR-West.Tokaido",
    "odpt.Railway:JR-West.Nara",
    "odpt.Railway:JR-West.Sagano",
    "odpt.Railway:KyotoMunicipal.Karasuma",
    "odpt.Railway:Kintetsu.Kyoto"
  ],
  "河原町": [
    "odpt.Railway:Hankyu.Kyoto"
  ],
  
  // Major Kobe Stations
  "三ノ宮": [
    "odpt.Railway:JR-West.Tokaido",
    "odpt.Railway:Hankyu.Kobe",
    "odpt.Railway:Hanshin.Main",
    "odpt.Railway:KobeMunicipal.Seishin-Yamate",
    "odpt.Railway:KobeMunicipal.Kaigan"
  ],
  "神戸": [
    "odpt.Railway:JR-West.Tokaido",
    "odpt.Railway:KobeMunicipal.Seishin-Yamate",
    "odpt.Railway:KobeMunicipal.Kaigan"
  ],
  
  // Major Fukuoka Stations
  "博多": [
    "odpt.Railway:JR-Kyushu.Kagoshima",
    "odpt.Railway:JR-Kyushu.Fukuhoku-Yutaka",
    "odpt.Railway:FukuokaCitySubway.Kuko"
  ],
  "天神": [
    "odpt.Railway:FukuokaCitySubway.Kuko",
    "odpt.Railway:FukuokaCitySubway.Nanakuma",
    "odpt.Railway:Nishitetsu.Tenjin-Omuta"
  ],
  
  // Major Sapporo Stations
  "札幌": [
    "odpt.Railway:JR-Hokkaido.Hakodate",
    "odpt.Railway:SapporoMunicipal.Namboku",
    "odpt.Railway:SapporoMunicipal.Toho"
  ],
  "大通": [
    "odpt.Railway:SapporoMunicipal.Namboku",
    "odpt.Railway:SapporoMunicipal.Tozai",
    "odpt.Railway:SapporoMunicipal.Toho"
  ],
  
  // Major Sendai Stations
  "仙台": [
    "odpt.Railway:JR-East.Tohoku",
    "odpt.Railway:JR-East.Senseki",
    "odpt.Railway:JR-East.Senzan",
    "odpt.Railway:SendaiMunicipal.Namboku",
    "odpt.Railway:SendaiMunicipal.Tozai"
  ],
  
  // Airport Stations
  "成田空港": [
    "odpt.Railway:JR-East.NaritaExpress",
    "odpt.Railway:JR-East.Narita",
    "odpt.Railway:Keisei.Main",
    "odpt.Railway:Keisei.Narita-Sky-Access"
  ],
  "羽田空港第1・第2ターミナル": [
    "odpt.Railway:TokyoMonorail.Haneda",
    "odpt.Railway:Keikyu.Airport"
  ],
  "羽田空港第3ターミナル": [
    "odpt.Railway:TokyoMonorail.Haneda",
    "odpt.Railway:Keikyu.Airport"
  ],
  "関西空港": [
    "odpt.Railway:JR-West.Kansai-Airport",
    "odpt.Railway:Nankai.Airport"
  ],
  "中部国際空港": [
    "odpt.Railway:Meitetsu.Airport"
  ]
};

// Mapping of line names to ODPT IDs
const LINE_NAME_TO_ID = {
  // JR Lines
  "山手線": "odpt.Railway:JR-East.Yamanote",
  "中央線": "odpt.Railway:JR-East.ChuoRapid",
  "中央線快速": "odpt.Railway:JR-East.ChuoRapid",
  "中央・総武線": "odpt.Railway:JR-East.Sobu",
  "総武線": "odpt.Railway:JR-East.Sobu",
  "京浜東北線": "odpt.Railway:JR-East.Keihin-Tohoku",
  "東海道線": "odpt.Railway:JR-East.Tokaido",
  "横須賀線": "odpt.Railway:JR-East.Yokosuka",
  "湘南新宿ライン": "odpt.Railway:JR-East.Shonan-Shinjuku",
  "埼京線": "odpt.Railway:JR-East.Saikyo",
  "常磐線": "odpt.Railway:JR-East.Joban",
  "宇都宮線": "odpt.Railway:JR-East.Utsunomiya",
  "高崎線": "odpt.Railway:JR-East.Takasaki",
  "武蔵野線": "odpt.Railway:JR-East.Musashino",
  "京葉線": "odpt.Railway:JR-East.Keiyo",
  "南武線": "odpt.Railway:JR-East.Nambu",
  "横浜線": "odpt.Railway:JR-East.Yokohama",
  
  // Tokyo Metro Lines
  "銀座線": "odpt.Railway:TokyoMetro.Ginza",
  "丸ノ内線": "odpt.Railway:TokyoMetro.Marunouchi",
  "日比谷線": "odpt.Railway:TokyoMetro.Hibiya",
  "東西線": "odpt.Railway:TokyoMetro.Tozai",
  "千代田線": "odpt.Railway:TokyoMetro.Chiyoda",
  "有楽町線": "odpt.Railway:TokyoMetro.Yurakucho",
  "半蔵門線": "odpt.Railway:TokyoMetro.Hanzomon",
  "南北線": "odpt.Railway:TokyoMetro.Namboku",
  "副都心線": "odpt.Railway:TokyoMetro.Fukutoshin",
  
  // Toei Lines
  "浅草線": "odpt.Railway:Toei.Asakusa",
  "三田線": "odpt.Railway:Toei.Mita",
  "新宿線": "odpt.Railway:Toei.Shinjuku",
  "大江戸線": "odpt.Railway:Toei.Oedo",
  
  // Private Railways
  "東急東横線": "odpt.Railway:Tokyu.Toyoko",
  "東急田園都市線": "odpt.Railway:Tokyu.Den-en-toshi",
  "東急目黒線": "odpt.Railway:Tokyu.Meguro",
  "東急池上線": "odpt.Railway:Tokyu.Ikegami",
  "東急大井町線": "odpt.Railway:Tokyu.Oimachi",
  "京王線": "odpt.Railway:Keio.Keio",
  "京王井の頭線": "odpt.Railway:Keio.Inokashira",
  "小田急線": "odpt.Railway:Odakyu.Odawara",
  "小田急江ノ島線": "odpt.Railway:Odakyu.Enoshima",
  "小田急多摩線": "odpt.Railway:Odakyu.Tama",
  "西武新宿線": "odpt.Railway:Seibu.Shinjuku",
  "西武池袋線": "odpt.Railway:Seibu.Ikebukuro",
  "東武東上線": "odpt.Railway:Tobu.Tojo",
  "東武伊勢崎線": "odpt.Railway:Tobu.Isesaki",
  "京成本線": "odpt.Railway:Keisei.Main",
  "京急本線": "odpt.Railway:Keikyu.Main",
  "相鉄本線": "odpt.Railway:Sotetsu.Main",
  "りんかい線": "odpt.Railway:TWR.Rinkai",
  "ゆりかもめ": "odpt.Railway:Yurikamome",
  "つくばエクスプレス": "odpt.Railway:TsukubaExpress"
};

// Helper class for station mapping
class StationMapper {
  constructor() {
    this.stationToLines = STATION_TO_LINES;
    this.lineNameToId = LINE_NAME_TO_ID;
  }

  /**
   * Get ODPT railway IDs for a given station name
   * @param {string} stationName - Station name in Japanese
   * @returns {Array} Array of ODPT railway IDs
   */
  getLinesByStation(stationName) {
    // Direct lookup
    if (this.stationToLines[stationName]) {
      return this.stationToLines[stationName];
    }
    
    // Try removing common suffixes
    const cleanedName = stationName.replace(/駅$/, '');
    if (this.stationToLines[cleanedName]) {
      return this.stationToLines[cleanedName];
    }
    
    // Try partial match
    for (const [key, value] of Object.entries(this.stationToLines)) {
      if (key.includes(cleanedName) || cleanedName.includes(key)) {
        return value;
      }
    }
    
    // Return empty array if not found
    return [];
  }

  /**
   * Get ODPT ID from line name
   * @param {string} lineName - Line name in Japanese
   * @returns {string|null} ODPT railway ID or null
   */
  getLineIdByName(lineName) {
    return this.lineNameToId[lineName] || null;
  }

  /**
   * Parse lines from station data and return ODPT IDs
   * @param {Object} stationData - Station data from all_japan_stations.json
   * @returns {Array} Array of ODPT railway IDs
   */
  parseStationLines(stationData) {
    const odpitIds = [];
    
    // First try direct station name lookup
    const directLines = this.getLinesByStation(stationData.name);
    if (directLines.length > 0) {
      return directLines;
    }
    
    // Then try to map from the lines array in station data
    if (stationData.lines && Array.isArray(stationData.lines)) {
      for (const line of stationData.lines) {
        const lineId = this.getLineIdByName(line);
        if (lineId && !odpitIds.includes(lineId)) {
          odpitIds.push(lineId);
        }
      }
    }
    
    // If still no matches, return default based on region
    if (odpitIds.length === 0) {
      return this.getDefaultLinesByRegion(stationData.prefecture);
    }
    
    return odpitIds;
  }

  /**
   * Get default lines based on prefecture
   * @param {string} prefecture - Prefecture name
   * @returns {Array} Array of default ODPT railway IDs for the region
   */
  getDefaultLinesByRegion(prefecture) {
    const regionDefaults = {
      "東京都": [
        "odpt.Railway:JR-East.Yamanote",
        "odpt.Railway:JR-East.ChuoRapid"
      ],
      "大阪府": [
        "odpt.Railway:JR-West.OsakaLoop",
        "odpt.Railway:OsakaMetro.Midosuji"
      ],
      "神奈川県": [
        "odpt.Railway:JR-East.Tokaido",
        "odpt.Railway:JR-East.Yokohama"
      ],
      "愛知県": [
        "odpt.Railway:JR-Central.Tokaido",
        "odpt.Railway:NagoyaMunicipal.Higashiyama"
      ],
      "京都府": [
        "odpt.Railway:JR-West.Tokaido",
        "odpt.Railway:KyotoMunicipal.Karasuma"
      ],
      "兵庫県": [
        "odpt.Railway:JR-West.Tokaido",
        "odpt.Railway:Hankyu.Kobe"
      ],
      "福岡県": [
        "odpt.Railway:JR-Kyushu.Kagoshima",
        "odpt.Railway:FukuokaCitySubway.Kuko"
      ],
      "北海道": [
        "odpt.Railway:JR-Hokkaido.Hakodate",
        "odpt.Railway:SapporoMunicipal.Namboku"
      ],
      "宮城県": [
        "odpt.Railway:JR-East.Tohoku",
        "odpt.Railway:SendaiMunicipal.Namboku"
      ]
    };
    
    return regionDefaults[prefecture] || [];
  }

  /**
   * Check if a station is a major hub
   * @param {string} stationName - Station name
   * @returns {boolean} True if station is a major hub
   */
  isMajorHub(stationName) {
    const majorHubs = [
      "東京", "新宿", "渋谷", "品川", "池袋",
      "大阪", "梅田", "難波", "天王寺",
      "横浜", "名古屋", "京都", "神戸", "福岡",
      "札幌", "仙台", "広島", "博多"
    ];
    
    const cleanedName = stationName.replace(/駅$/, '');
    return majorHubs.includes(cleanedName);
  }

  /**
   * Get delay check priority for a station
   * @param {string} stationName - Station name
   * @returns {number} Priority level (1-3, 1 being highest)
   */
  getDelayCheckPriority(stationName) {
    if (this.isMajorHub(stationName)) {
      return 1; // Check every minute
    }
    
    const lines = this.getLinesByStation(stationName);
    if (lines.length > 3) {
      return 2; // Check every 2 minutes
    }
    
    return 3; // Check every 5 minutes
  }

  /**
   * Format ODPT ID for API call
   * @param {string} lineId - ODPT railway ID
   * @returns {string} Formatted ID for API
   */
  formatForApi(lineId) {
    // Ensure proper format
    if (!lineId.startsWith("odpt.Railway:")) {
      return `odpt.Railway:${lineId}`;
    }
    return lineId;
  }

  /**
   * Get human-readable line name from ODPT ID
   * @param {string} odpitId - ODPT railway ID
   * @returns {string} Human-readable line name
   */
  getLineNameFromId(odpitId) {
    // Reverse lookup
    for (const [name, id] of Object.entries(this.lineNameToId)) {
      if (id === odpitId) {
        return name;
      }
    }
    
    // Extract from ID if not found
    const parts = odpitId.split(":");
    if (parts.length > 1) {
      return parts[1].replace(/\./g, " ");
    }
    
    return odpitId;
  }
}

// Export singleton instance
const stationMapper = new StationMapper();

export default stationMapper;
export { STATION_TO_LINES, LINE_NAME_TO_ID, StationMapper };
