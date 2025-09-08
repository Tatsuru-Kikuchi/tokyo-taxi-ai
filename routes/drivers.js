// /backend/routes/drivers.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get nearby drivers
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    
    // Simple distance calculation (in km)
    // In production, use PostGIS for accurate distance
    const query = `
      SELECT 
        id, name, rating, current_lat, current_lng,
        SQRT(POW(69.1 * (current_lat - $1), 2) + 
             POW(69.1 * ($2 - current_lng) * COS(current_lat / 57.3), 2)) AS distance
      FROM drivers
      WHERE is_online = true
        AND current_lat IS NOT NULL
        AND current_lng IS NOT NULL
      HAVING SQRT(POW(69.1 * (current_lat - $1), 2) + 
                  POW(69.1 * ($2 - current_lng) * COS(current_lat / 57.3), 2)) < $3
      ORDER BY distance
      LIMIT 10
    `;
    
    const result = await pool.query(query, [parseFloat(lat), parseFloat(lng), radius]);
    
    res.json({
      success: true,
      drivers: result.rows
    });
  } catch (error) {
    console.error('Get nearby drivers error:', error);
    res.status(500).json({ error: 'Failed to get nearby drivers' });
  }
});

// Update driver location
router.post('/location', async (req, res) => {
  try {
    const { driverId, lat, lng } = req.body;
    
    const query = `
      UPDATE drivers 
      SET current_lat = $2, current_lng = $3, last_updated = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [driverId, lat, lng]);
    
    res.json({
      success: true,
      driver: result.rows[0]
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

module.exports = router;
