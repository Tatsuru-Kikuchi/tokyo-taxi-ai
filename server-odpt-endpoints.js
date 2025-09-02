// Import ODPT service
const odptService = require('./odpt-service');

// Real-time train data from ODPT
app.get("/api/trains/realtime", async (req, res) => {
  const { station } = req.query;
  try {
    const trains = await odptService.getTrainSchedule(station);
    res.json({
      source: 'ODPT',
      station: station || 'all',
      trains: trains,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch train data' });
  }
});

// Station timetable from ODPT
app.get("/api/trains/timetable", async (req, res) => {
  const { stationId } = req.query;
  try {
    const timetable = await odptService.getStationTimetable(stationId || 'odpt.Station:JR-East.Yamanote.Tokyo');
    res.json({
      source: 'ODPT',
      stationId: stationId,
      timetable: timetable,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// Real-time bus data from ODPT
app.get("/api/bus/realtime", async (req, res) => {
  const { stop } = req.query;
  try {
    const buses = await odptService.getBusSchedule(stop);
    res.json({
      source: 'ODPT',
      stop: stop || 'all',
      buses: buses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bus data' });
  }
});

// Train congestion and delay info from ODPT
app.get("/api/trains/congestion", async (req, res) => {
  const { trainId } = req.query;
  try {
    const congestion = await odptService.getTrainCongestion(trainId);
    res.json({
      source: 'ODPT',
      trainId: trainId,
      congestion: congestion,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch congestion data' });
  }
});
