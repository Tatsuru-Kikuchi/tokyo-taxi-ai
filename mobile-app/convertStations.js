// convertStations.js
const fs = require('fs');

// Comprehensive prefecture mapping based on coordinates
const getPrefecture = (lat, lng) => {
  // Hokkaido
  if (lat > 41.5) return '北海道';
  
  // Tohoku Region
  if (lat > 40.5 && lat <= 41.5) return '青森県';
  if (lat > 39.5 && lat <= 40.5 && lng < 141.5) return '秋田県';
  if (lat > 39.5 && lat <= 40.5 && lng >= 141.5) return '岩手県';
  if (lat > 38.5 && lat <= 39.5 && lng < 140.5) return '山形県';
  if (lat > 38.0 && lat <= 39.5 && lng >= 140.5) return '宮城県';
  if (lat > 37.0 && lat <= 38.0 && lng >= 140.0) return '福島県';
  
  // Kanto Region
  if (lat > 36.5 && lat <= 37.0 && lng >= 140.0) return '茨城県';
  if (lat > 36.2 && lat <= 36.8 && lng >= 139.3 && lng < 140.0) return '栃木県';
  if (lat > 36.0 && lat <= 36.6 && lng >= 138.5 && lng < 139.3) return '群馬県';
  if (lat > 35.8 && lat <= 36.3 && lng >= 139.0 && lng < 140.0) return '埼玉県';
  if (lat > 35.5 && lat <= 35.9 && lng >= 140.0) return '千葉県';
  if (lat > 35.5 && lat <= 35.9 && lng >= 139.5 && lng < 140.0) return '東京都';
  if (lat > 35.1 && lat <= 35.7 && lng >= 139.0 && lng < 139.8) return '神奈川県';
  
  // Chubu Region
  if (lat > 36.0 && lat <= 37.0 && lng >= 137.5 && lng < 139.0) return '新潟県';
  if (lat > 36.5 && lat <= 37.0 && lng >= 136.5 && lng < 137.5) return '富山県';
  if (lat > 36.0 && lat <= 36.7 && lng >= 136.0 && lng < 137.0) return '石川県';
  if (lat > 35.5 && lat <= 36.3 && lng >= 136.5 && lng < 137.0) return '福井県';
  if (lat > 35.3 && lat <= 36.0 && lng >= 138.0 && lng < 139.0) return '山梨県';
  if (lat > 35.8 && lat <= 37.0 && lng >= 137.5 && lng < 138.5) return '長野県';
  if (lat > 35.0 && lat <= 35.8 && lng >= 137.0 && lng < 137.8) return '岐阜県';
  if (lat > 34.5 && lat <= 35.5 && lng >= 138.0 && lng < 139.0) return '静岡県';
  if (lat > 34.5 && lat <= 35.5 && lng >= 136.5 && lng < 137.5) return '愛知県';
  
  // Kansai Region
  if (lat > 34.5 && lat <= 35.5 && lng >= 135.5 && lng < 136.5) return '三重県';
  if (lat > 35.0 && lat <= 35.5 && lng >= 135.5 && lng < 136.3) return '滋賀県';
  if (lat > 34.9 && lat <= 35.6 && lng >= 135.0 && lng < 135.9) return '京都府';
  if (lat > 34.4 && lat <= 34.9 && lng >= 135.0 && lng < 135.7) return '大阪府';
  if (lat > 34.5 && lat <= 35.5 && lng >= 134.5 && lng < 135.5) return '兵庫県';
  if (lat > 34.0 && lat <= 34.8 && lng >= 135.5 && lng < 136.1) return '奈良県';
  if (lat > 33.5 && lat <= 34.4 && lng >= 135.0 && lng < 135.8) return '和歌山県';
  
  // Chugoku Region
  if (lat > 34.3 && lat <= 35.6 && lng >= 133.5 && lng < 134.5) return '鳥取県';
  if (lat > 34.5 && lat <= 35.5 && lng >= 132.0 && lng < 133.5) return '島根県';
  if (lat > 34.0 && lat <= 35.0 && lng >= 133.5 && lng < 134.5) return '岡山県';
  if (lat > 34.0 && lat <= 34.8 && lng >= 132.5 && lng < 133.5) return '広島県';
  if (lat > 34.0 && lat <= 34.5 && lng >= 130.8 && lng < 132.5) return '山口県';
  
  // Shikoku Region
  if (lat > 33.5 && lat <= 34.5 && lng >= 133.5 && lng < 134.5) return '徳島県';
  if (lat > 34.0 && lat <= 34.5 && lng >= 133.0 && lng < 134.5) return '香川県';
  if (lat > 33.0 && lat <= 34.0 && lng >= 132.5 && lng < 133.5) return '愛媛県';
  if (lat > 32.7 && lat <= 33.9 && lng >= 132.5 && lng < 134.0) return '高知県';
  
  // Kyushu Region
  if (lat > 33.0 && lat <= 34.0 && lng >= 130.0 && lng < 131.5) return '福岡県';
  if (lat > 33.0 && lat <= 33.6 && lng >= 129.5 && lng < 130.5) return '佐賀県';
  if (lat > 32.5 && lat <= 33.5 && lng >= 129.5 && lng < 130.5) return '長崎県';
  if (lat > 32.5 && lat <= 33.5 && lng >= 130.5 && lng < 131.5) return '熊本県';
  if (lat > 32.7 && lat <= 33.6 && lng >= 131.0 && lng < 132.0) return '大分県';
  if (lat > 31.5 && lat <= 32.5 && lng >= 130.5 && lng < 131.5) return '宮崎県';
  if (lat > 31.0 && lat <= 32.0 && lng >= 130.0 && lng < 131.0) return '鹿児島県';
  
  // Okinawa
  if (lat > 24.0 && lat <= 28.0 && lng >= 122.0 && lng < 130.0) return '沖縄県';
  
  // Default
  return '東京都';
};

// Railway line name mapping
const getLineName = (railwayId) => {
  if (!railwayId) return '不明';
  
  const lineMap = {
    'JR-East.Yamanote': 'JR山手線',
    'JR-East.ChuoRapid': 'JR中央線快速',
    'JR-East.ChuoSobuLocal': 'JR中央・総武線各駅停車',
    'JR-East.Keihin-Tohoku': 'JR京浜東北線',
    'JR-East.Tokaido': 'JR東海道線',
    'JR-East.Yokosuka': 'JR横須賀線',
    'JR-East.Takasaki': 'JR高崎線',
    'JR-East.Utsunomiya': 'JR宇都宮線',
    'JR-East.Joban': 'JR常磐線',
    'JR-East.SaikyoKawagoe': 'JR埼京線',
    'JR-East.ShonanShinjuku': 'JR湘南新宿ライン',
    'JR-East.Sobu': 'JR総武線',
    'JR-East.Uchibo': 'JR内房線',
    'JR-East.Sotobo': 'JR外房線',
    'JR-East.Yokohama': 'JR横浜線',
    'JR-East.Nambu': 'JR南武線',
    'JR-East.Tsurumi': 'JR鶴見線',
    'JR-East.Musashino': 'JR武蔵野線',
    'JR-East.Keiyo': 'JR京葉線',
    
    'TokyoMetro.Ginza': '東京メトロ銀座線',
    'TokyoMetro.Marunouchi': '東京メトロ丸ノ内線',
    'TokyoMetro.Hibiya': '東京メトロ日比谷線',
    'TokyoMetro.Tozai': '東京メトロ東西線',
    'TokyoMetro.Chiyoda': '東京メトロ千代田線',
    'TokyoMetro.Yurakucho': '東京メトロ有楽町線',
    'TokyoMetro.Hanzomon': '東京メトロ半蔵門線',
    'TokyoMetro.Namboku': '東京メトロ南北線',
    'TokyoMetro.Fukutoshin': '東京メトロ副都心線',
    
    'Toei.Asakusa': '都営浅草線',
    'Toei.Mita': '都営三田線',
    'Toei.Shinjuku': '都営新宿線',
    'Toei.Oedo': '都営大江戸線',
    
    'Odakyu.Odawara': '小田急線',
    'Keio.Keio': '京王線',
    'Keio.Inokashira': '京王井の頭線',
    'Tokyu.Toyoko': '東急東横線',
    'Tokyu.Meguro': '東急目黒線',
    'Tokyu.DenEnToshi': '東急田園都市線',
    'Tokyu.Oimachi': '東急大井町線',
    'Tokyu.Ikegami': '東急池上線',
    'Tokyu.TokyuTamagawa': '東急多摩川線',
    'Tokyu.Setagaya': '東急世田谷線',
    
    'Tobu.Skytree': '東武スカイツリーライン',
    'Tobu.Isesaki': '東武伊勢崎線',
    'Tobu.Nikko': '東武日光線',
    'Tobu.Tojo': '東武東上線',
    'Tobu.Noda': '東武野田線',
    
    'Seibu.Ikebukuro': '西武池袋線',
    'Seibu.Shinjuku': '西武新宿線',
    'Seibu.Seibuen': '西武西武園線',
    'Seibu.Kokubunji': '西武国分寺線',
    'Seibu.Haijima': '西武拝島線',
    'Seibu.Tamako': '西武多摩湖線',
    
    'Keisei.Main': '京成本線',
    'Keisei.Oshiage': '京成押上線',
    'Keisei.Kanamachi': '京成金町線',
    
    'Keikyu.Main': '京急本線',
    'Keikyu.Airport': '京急空港線',
    'Keikyu.Daishi': '京急大師線',
    'Keikyu.Zushi': '京急逗子線',
    'Keikyu.Kurihama': '京急久里浜線',
    
    'TWR.Rinkai': 'りんかい線',
    'Yurikamome.Yurikamome': 'ゆりかもめ',
    
    // Add more mappings as needed
  };
  
  const id = railwayId.split(':').pop();
  return lineMap[id] || id.replace(/\./g, ' ');
};

// Main conversion function
const convertStations = () => {
  try {
    // Read the raw ODPT data
    const rawData = JSON.parse(fs.readFileSync('data/stations_raw.json', 'utf8'));
    
    // Convert to simplified format
    const stations = rawData
      .map((station, index) => {
        const lat = station['geo:lat'];
        const lng = station['geo:long'];
        
        // Extract station name
        let name = station['dc:title'] || 
                   station['odpt:stationTitle']?.ja || 
                   station['odpt:stationTitle'] || 
                   '不明';
        
        // Add 駅 suffix if not present
        if (name !== '不明' && !name.endsWith('駅')) {
          name += '駅';
        }
        
        // Extract railway lines
        let lines = [];
        if (station['odpt:railway']) {
          if (Array.isArray(station['odpt:railway'])) {
            lines = station['odpt:railway'].map(r => getLineName(r));
          } else {
            lines = [getLineName(station['odpt:railway'])];
          }
        }
        
        return {
          id: index + 1,
          name: name,
          lat: lat || 35.6812,
          lng: lng || 139.7671,
          prefecture: getPrefecture(lat, lng),
          lines: lines.length > 0 ? lines : ['不明']
        };
      })
      .filter(station => station.name !== '不明' && station.lat && station.lng)
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    
    // Remove duplicates (same name and location)
    const uniqueStations = [];
    const seen = new Set();
    
    for (const station of stations) {
      const key = `${station.name}_${station.lat.toFixed(3)}_${station.lng.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueStations.push({
          ...station,
          id: uniqueStations.length + 1
        });
      }
    }
    
    // Save to file
    fs.writeFileSync('data/all_japan_stations.json', JSON.stringify(uniqueStations, null, 2));
    
    console.log(`Successfully converted ${uniqueStations.length} unique stations`);
    console.log(`Prefecture distribution:`);
    
    // Show distribution by prefecture
    const prefectureCounts = {};
    uniqueStations.forEach(s => {
      prefectureCounts[s.prefecture] = (prefectureCounts[s.prefecture] || 0) + 1;
    });
    
    Object.entries(prefectureCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([pref, count]) => {
        console.log(`  ${pref}: ${count} stations`);
      });
      
  } catch (error) {
    console.error('Error converting stations:', error);
    console.error('Make sure stations_raw.json exists in the data folder');
  }
};

// Run the conversion
convertStations();
