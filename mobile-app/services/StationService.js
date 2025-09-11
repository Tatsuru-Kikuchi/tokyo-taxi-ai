import stationData from '../data/all_japan_stations.json';

export const StationService = {
  getAllStations: () => {
    return stationData;
  },

  searchStations: (query) => {
    return stationData.filter(station =>
      station.name.includes(query)
    );
  },

  getNearbyStations: (lat, lng, limit = 10) => {
    return stationData
      .map(station => ({
        ...station,
        distance: Math.sqrt(
          Math.pow(station.lat - lat, 2) +
          Math.pow(station.lng - lng, 2)
        ) * 111000 // Convert to meters
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }
};
