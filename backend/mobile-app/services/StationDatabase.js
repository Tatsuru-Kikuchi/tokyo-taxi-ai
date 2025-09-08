// services/StationDatabase.js
import stationsJSON from './data/all_japan_stations.json';

export const StationDB = {
  // All 9,000+ stations loaded once
  stations: stationsJSON,

  search: (query) => {
    return stations.filter(s =>
      s.name.includes(query) ||
      s.reading.includes(query)
    );
  },

  getNearby: (lat, lng, limit = 20) => {
    return stations
      .map(s => ({
        ...s,
        distance: calculateDistance(lat, lng, s.lat, s.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }
};
