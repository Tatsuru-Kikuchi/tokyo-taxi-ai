const fs = require('fs');

const stations = JSON.parse(fs.readFileSync('./all_japan_stations.json', 'utf8'));

// Comprehensive prefecture detection
function getPrefecture(lat, lng) {
  // Tokyo
  if (lat >= 35.5 && lat <= 35.9 && lng >= 139.3 && lng <= 140.0) return '東京都';
  // Osaka
  if (lat >= 34.4 && lat <= 34.8 && lng >= 135.3 && lng <= 135.7) return '大阪府';
  // Kyoto
  if (lat >= 34.7 && lat <= 35.2 && lng >= 135.5 && lng <= 136.0) return '京都府';
  // Kanagawa
  if (lat >= 35.1 && lat <= 35.7 && lng >= 139.0 && lng <= 139.8) return '神奈川県';
  // Saitama
  if (lat >= 35.7 && lat <= 36.3 && lng >= 138.7 && lng <= 139.9) return '埼玉県';
  // Chiba
  if (lat >= 34.9 && lat <= 36.2 && lng >= 139.7 && lng <= 140.9) return '千葉県';
  // Aichi
  if (lat >= 34.5 && lat <= 35.5 && lng >= 136.6 && lng <= 137.8) return '愛知県';
  // Hyogo
  if (lat >= 34.2 && lat <= 35.7 && lng >= 134.2 && lng <= 135.5) return '兵庫県';
  // Hokkaido
  if (lat >= 41.3 && lat <= 45.6) return '北海道';
  // Fukuoka
  if (lat >= 33.1 && lat <= 34.3 && lng >= 129.9 && lng <= 131.2) return '福岡県';
  // Hiroshima
  if (lat >= 34.0 && lat <= 35.0 && lng >= 132.0 && lng <= 133.4) return '広島県';
  // Miyagi
  if (lat >= 37.8 && lat <= 39.0 && lng >= 140.2 && lng <= 141.7) return '宮城県';
  
  // Default by latitude ranges (rough approximation)
  if (lat > 43) return '北海道';
  if (lat > 40) return '東北地方';
  if (lat > 36) return '関東地方';
  if (lat > 35) return '中部地方';
  if (lat > 34) return '関西地方';
  if (lat > 33) return '中国・四国地方';
  if (lat > 31) return '九州地方';
  
  return '不明';
}

// Clean up operator/line names
function cleanOperator(op) {
  if (!op || op === '不明') return 'JR/私鉄';
  if (op.includes('東日本旅客鉄道')) return 'JR東日本';
  if (op.includes('西日本旅客鉄道')) return 'JR西日本';
  if (op.includes('東海旅客鉄道')) return 'JR東海';
  if (op.includes('九州旅客鉄道')) return 'JR九州';
  if (op.includes('北海道旅客鉄道')) return 'JR北海道';
  if (op.includes('四国旅客鉄道')) return 'JR四国';
  return op;
}

// Fix all stations
const fixedStations = stations.map(station => ({
  ...station,
  prefecture: getPrefecture(station.lat, station.lng),
  lines: station.lines.map(line => cleanOperator(line))
}));

// Save
fs.writeFileSync('./all_japan_stations.json', JSON.stringify(fixedStations, null, 2));

// Summary
const prefCount = {};
fixedStations.forEach(s => {
  prefCount[s.prefecture] = (prefCount[s.prefecture] || 0) + 1;
});

console.log('Fixed prefectures for all stations');
console.log('\nTop prefectures:');
Object.entries(prefCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([pref, count]) => {
  console.log(`  ${pref}: ${count} stations`);
});

console.log(`\nTotal: ${fixedStations.length} stations`);
