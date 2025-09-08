const fs = require('fs');

// Prefecture mapping
const PREFECTURE_RANGES = [
  { name: '北海道', latMin: 41.5, latMax: 45.5, lngMin: 139.5, lngMax: 145.8 },
  { name: '青森県', latMin: 40.2, latMax: 41.5, lngMin: 139.5, lngMax: 141.7 },
  { name: '岩手県', latMin: 38.8, latMax: 40.3, lngMin: 140.7, lngMax: 142.1 },
  { name: '宮城県', latMin: 37.8, latMax: 39.0, lngMin: 140.3, lngMax: 141.7 },
  { name: '秋田県', latMin: 38.9, latMax: 40.5, lngMin: 139.5, lngMax: 140.9 },
  { name: '山形県', latMin: 37.8, latMax: 39.2, lngMin: 139.5, lngMax: 140.6 },
  { name: '福島県', latMin: 36.8, latMax: 37.9, lngMin: 139.2, lngMax: 141.1 },
  { name: '茨城県', latMin: 35.8, latMax: 36.9, lngMin: 139.7, lngMax: 140.9 },
  { name: '栃木県', latMin: 36.2, latMax: 37.2, lngMin: 139.3, lngMax: 140.3 },
  { name: '群馬県', latMin: 35.9, latMax: 37.1, lngMin: 138.4, lngMax: 139.6 },
  { name: '埼玉県', latMin: 35.8, latMax: 36.3, lngMin: 138.7, lngMax: 139.9 },
  { name: '千葉県', latMin: 34.9, latMax: 36.1, lngMin: 139.7, lngMax: 140.9 },
  { name: '東京都', latMin: 35.5, latMax: 35.9, lngMin: 138.9, lngMax: 139.9 },
  { name: '神奈川県', latMin: 35.1, latMax: 35.7, lngMin: 138.9, lngMax: 139.8 },
  { name: '新潟県', latMin: 36.8, latMax: 38.6, lngMin: 137.6, lngMax: 139.9 },
  { name: '富山県', latMin: 36.3, latMax: 36.8, lngMin: 136.8, lngMax: 137.8 },
  { name: '石川県', latMin: 36.0, latMax: 37.5, lngMin: 136.2, lngMax: 137.4 },
  { name: '福井県', latMin: 35.3, latMax: 36.3, lngMin: 135.4, lngMax: 136.8 },
  { name: '山梨県', latMin: 35.2, latMax: 35.9, lngMin: 138.2, lngMax: 139.2 },
  { name: '長野県', latMin: 35.2, latMax: 37.0, lngMin: 137.3, lngMax: 138.7 },
  { name: '岐阜県', latMin: 35.2, latMax: 36.5, lngMin: 136.3, lngMax: 137.7 },
  { name: '静岡県', latMin: 34.6, latMax: 35.6, lngMin: 137.5, lngMax: 139.2 },
  { name: '愛知県', latMin: 34.6, latMax: 35.4, lngMin: 136.7, lngMax: 137.8 },
  { name: '三重県', latMin: 33.7, latMax: 35.3, lngMin: 135.8, lngMax: 136.9 },
  { name: '滋賀県', latMin: 34.8, latMax: 35.7, lngMin: 135.8, lngMax: 136.5 },
  { name: '京都府', latMin: 34.7, latMax: 35.8, lngMin: 134.8, lngMax: 136.1 },
  { name: '大阪府', latMin: 34.3, latMax: 35.0, lngMin: 135.1, lngMax: 135.8 },
  { name: '兵庫県', latMin: 34.2, latMax: 35.7, lngMin: 134.3, lngMax: 135.5 },
  { name: '奈良県', latMin: 33.8, latMax: 34.8, lngMin: 135.5, lngMax: 136.2 },
  { name: '和歌山県', latMin: 33.4, latMax: 34.4, lngMin: 135.0, lngMax: 136.0 },
  { name: '鳥取県', latMin: 35.1, latMax: 35.6, lngMin: 133.1, lngMax: 134.5 },
  { name: '島根県', latMin: 34.3, latMax: 36.3, lngMin: 131.6, lngMax: 133.4 },
  { name: '岡山県', latMin: 34.3, latMax: 35.4, lngMin: 133.3, lngMax: 134.4 },
  { name: '広島県', latMin: 34.0, latMax: 35.0, lngMin: 132.0, lngMax: 133.4 },
  { name: '山口県', latMin: 33.7, latMax: 34.7, lngMin: 130.8, lngMax: 132.5 },
  { name: '徳島県', latMin: 33.5, latMax: 34.3, lngMin: 133.5, lngMax: 134.8 },
  { name: '香川県', latMin: 34.0, latMax: 34.5, lngMin: 133.5, lngMax: 134.5 },
  { name: '愛媛県', latMin: 32.9, latMax: 34.3, lngMin: 132.0, lngMax: 133.7 },
  { name: '高知県', latMin: 32.7, latMax: 33.9, lngMin: 132.4, lngMax: 134.3 },
  { name: '福岡県', latMin: 33.1, latMax: 34.2, lngMin: 129.9, lngMax: 131.2 },
  { name: '佐賀県', latMin: 32.9, latMax: 33.6, lngMin: 129.7, lngMax: 130.6 },
  { name: '長崎県', latMin: 32.5, latMax: 34.7, lngMin: 128.3, lngMax: 130.4 },
  { name: '熊本県', latMin: 32.1, latMax: 33.2, lngMin: 130.0, lngMax: 131.3 },
  { name: '大分県', latMin: 32.7, latMax: 33.6, lngMin: 130.8, lngMax: 132.1 },
  { name: '宮崎県', latMin: 31.3, latMax: 32.9, lngMin: 130.7, lngMax: 131.9 },
  { name: '鹿児島県', latMin: 27.0, latMax: 32.1, lngMin: 128.5, lngMax: 131.2 },
  { name: '沖縄県', latMin: 24.0, latMax: 27.0, lngMin: 122.5, lngMax: 131.0 }
];

function getPrefectureFromCoords(lat, lng) {
  for (const range of PREFECTURE_RANGES) {
    if (lat >= range.latMin && lat <= range.latMax && 
        lng >= range.lngMin && lng <= range.lngMax) {
      return range.name;
    }
  }
  return '不明';
}

function cleanRailwayName(railway) {
  if (!railway) return '不明';
  
  const parts = railway.split(':').pop();
  const segments = parts.split('.');
  
  // Extract operator and line name
  let operator = segments[0] || '';
  let lineName = segments[segments.length - 1] || parts;
  
  // Add JR prefix if needed
  if (operator.includes('JR')) {
    return 'JR' + lineName.replace(/([A-Z])/g, ' $1').trim();
  }
  
  // Add metro prefixes
  if (operator === 'TokyoMetro') {
    return '東京メトロ' + lineName;
  }
  if (operator === 'Toei') {
    return '都営' + lineName;
  }
  
  // Return cleaned name
  return lineName.replace(/([A-Z])/g, ' $1').trim();
}

console.log('Reading stations_raw.json...');
try {
  const rawData = JSON.parse(fs.readFileSync('./stations_raw.json', 'utf8'));
  console.log(`Found ${rawData.length} raw stations`);
  
  const stationsMap = new Map();
  
  rawData.forEach(station => {
    if (!station['geo:lat'] || !station['geo:long']) return;
    
    const lat = parseFloat(station['geo:lat']);
    const lng = parseFloat(station['geo:long']);
    
    // Get station name
    let name = '不明';
    if (station['odpt:stationTitle'] && station['odpt:stationTitle']['ja']) {
      name = station['odpt:stationTitle']['ja'];
    } else if (station['dc:title']) {
      name = station['dc:title'];
    }
    
    if (name === '不明') return;
    
    // Get railway line
    const railway = cleanRailwayName(station['odpt:railway']);
    
    // Create unique key
    const key = `${name}_${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
    
    if (stationsMap.has(key)) {
      const existing = stationsMap.get(key);
      if (!existing.lines.includes(railway)) {
        existing.lines.push(railway);
      }
    } else {
      stationsMap.set(key, {
        name: name,
        lat: lat,
        lng: lng,
        prefecture: getPrefectureFromCoords(lat, lng),
        lines: [railway]
      });
    }
  });
  
  // Convert to array
  const stations = Array.from(stationsMap.values())
    .map((station, index) => ({
      id: index + 1,
      ...station
    }));
  
  // Save
  fs.writeFileSync('./all_japan_stations.json', JSON.stringify(stations, null, 2));
  
  console.log(`\nSuccess! Created ${stations.length} unique stations`);
  console.log('Saved to all_japan_stations.json');
  
  // Show summary
  const prefCount = {};
  stations.forEach(s => {
    prefCount[s.prefecture] = (prefCount[s.prefecture] || 0) + 1;
  });
  
  console.log('\nTop 5 prefectures:');
  Object.entries(prefCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([pref, count]) => console.log(`  ${pref}: ${count} stations`));
    
} catch (error) {
  console.error('Error:', error.message);
}
