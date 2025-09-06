const fs = require('fs');

console.log('Reading OSM station data...');
const rawData = JSON.parse(fs.readFileSync('./osm_stations.json', 'utf8'));

if (!rawData.elements || rawData.elements.length === 0) {
  console.error('No station elements found');
  process.exit(1);
}

console.log(`Found ${rawData.elements.length} OSM elements`);

// Transform and clean data
const stationsMap = new Map();

rawData.elements.forEach(node => {
  if (!node.tags || !node.lat || !node.lon) return;
  
  // Get station name (prefer Japanese)
  const name = node.tags['name:ja'] || 
               node.tags.name || 
               node.tags['name:en'];
               
  if (!name) return;
  
  // Skip if name contains only non-Japanese characters (likely foreign)
  if (!/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(name) && !node.tags['name:ja']) {
    return;
  }
  
  // Extract info
  const station = {
    name: name,
    nameEn: node.tags['name:en'] || '',
    lat: parseFloat(node.lat),
    lng: parseFloat(node.lon),
    prefecture: getPrefecture(node.lat, node.lon),
    lines: [],
    operator: node.tags.operator || node.tags.network || ''
  };
  
  // Add line info
  if (node.tags.operator) station.lines.push(node.tags.operator);
  if (node.tags.network && !station.lines.includes(node.tags.network)) {
    station.lines.push(node.tags.network);
  }
  if (station.lines.length === 0) station.lines.push('不明');
  
  // Create unique key
  const key = `${station.name}_${Math.round(station.lat * 100)}_${Math.round(station.lng * 100)}`;
  
  if (!stationsMap.has(key)) {
    stationsMap.set(key, station);
  }
});

// Convert to array
const stations = Array.from(stationsMap.values())
  .map((s, i) => ({ id: i + 1, ...s }))
  .sort((a, b) => {
    if (a.prefecture !== b.prefecture) return a.prefecture.localeCompare(b.prefecture);
    return a.name.localeCompare(b.name);
  });

// Save
fs.writeFileSync('./all_japan_stations.json', JSON.stringify(stations, null, 2));

console.log(`\nSuccess! Created ${stations.length} unique stations`);

// Summary
const prefCount = {};
stations.forEach(s => {
  prefCount[s.prefecture] = (prefCount[s.prefecture] || 0) + 1;
});

console.log('\nStations by prefecture:');
Object.entries(prefCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([pref, count]) => {
    console.log(`  ${pref}: ${count} stations`);
  });

function getPrefecture(lat, lng) {
  lat = parseFloat(lat);
  lng = parseFloat(lng);
  
  // Major regions (simplified)
  if (lat > 43) return '北海道';
  if (lat > 40 && lng < 141.5) return '青森県';
  if (lat > 39 && lng > 140.5 && lng < 142) return '岩手県';
  if (lat > 38 && lat < 39 && lng > 140) return '宮城県';
  if (lat > 36.5 && lat < 37.5 && lng < 140) return '福島県';
  if (lat > 35.5 && lat < 36 && lng > 139.5 && lng < 140) return '東京都';
  if (lat > 35.3 && lat < 35.7 && lng > 139.5 && lng < 139.8) return '神奈川県';
  if (lat > 35.8 && lat < 36.3 && lng > 139) return '埼玉県';
  if (lat > 34.9 && lat < 36.2 && lng > 139.7) return '千葉県';
  if (lat > 35 && lat < 35.3 && lng > 136.8 && lng < 137) return '愛知県';
  if (lat > 34.5 && lat < 34.8 && lng > 135.3 && lng < 135.7) return '大阪府';
  if (lat > 34.9 && lat < 35.2 && lng > 135.6 && lng < 135.9) return '京都府';
  if (lat > 34.3 && lat < 34.7 && lng > 132.3 && lng < 132.6) return '広島県';
  if (lat > 33.4 && lat < 33.7 && lng > 130.2 && lng < 130.5) return '福岡県';
  
  return '不明';
}
