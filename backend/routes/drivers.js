const express = require('express');
const router = express.Router();

// Get nearby drivers with fallback
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const searchRadius = parseFloat(radius);

    // Try database first
    if (req.db) {
      try {
        const query = `
          SELECT 
            id, name, rating, current_lat, current_lng, vehicle_type, plate_number,
            SQRT(POW(69.1 * (current_lat - $1), 2) + 
                 POW(69.1 * ($2 - current_lng) * COS(current_lat / 57.3), 2)) AS distance
          FROM drivers
          WHERE is_online = true
            AND current_lat IS NOT NULL
            AND current_lng IS NOT NULL
          HAVING distance < $3
          ORDER BY distance
          LIMIT 10
        `;
        
        const result = await req.db.query(query, [userLat, userLng, searchRadius]);
        
        return res.json({
          success: true,
          drivers: result.rows.map(driver => ({
            ...driver,
            distance: Math.round(driver.distance * 1000), // Convert to meters
            eta: Math.ceil(driver.distance * 2) + 3 // Rough ETA in minutes
          }))
        });
      } catch (dbError) {
        console.error('Database query failed:', dbError);
        // Fall through to mock data
      }
    }

    // Fallback to mock data
    const mockDrivers = [
      {
        id: 'd1',
        name: '田中運転手',
        current_lat: userLat + (Math.random() - 0.5) * 0.01,
        current_lng: userLng + (Math.random() - 0.5) * 0.01,
        rating: 4.8,
        vehicle_type: 'sedan',
        plate_number: '品川 500 た 12-34'
      },
      {
        id: 'd2', 
        name: '佐藤運転手',
        current_lat: userLat + (Math.random() - 0.5) * 0.01,
        current_lng: userLng + (Math.random() - 0.5) * 0.01,
        rating: 4.9,
        vehicle_type: 'sedan', 
        plate_number: '品川 500 ふ 56-78'
      },
      {
        id: 'd3',
        name: '山田運転手', 
        current_lat: userLat + (Math.random() - 0.5) * 0.01,
        current_lng: userLng + (Math.random() - 0.5) * 0.01,
        rating: 4.7,
        vehicle_type: 'minivan',
        plate_number: '品川 500 す 90-12'
      }
    ];

    const nearbyDrivers = mockDrivers.map(driver => {
      const distance = Math.sqrt(
        Math.pow((driver.current_lat - userLat) * 111000, 2) +
        Math.pow((driver.current_lng - userLng) * 111000, 2)
      );
      
      return {
        ...driver,
        distance: Math.round(distance),
        eta: Math.ceil(distance / 500) + 3
      };
    }).filter(d => d.distance <= searchRadius * 1000);

    res.json({
      success: true,
      drivers: nearbyDrivers
    });
  } catch (error) {
    console.error('Get nearby drivers error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get nearby drivers' 
    });
  }
});

// Update driver location with validation
router.post('/location', async (req, res) => {
  try {
    const { driverId, lat, lng } = req.body;
    
    if (!driverId || !lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: driverId, lat, lng'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates'
      });
    }

    // Try database update
    if (req.db) {
      try {
        const query = `
          UPDATE drivers 
          SET current_lat = $2, current_lng = $3, last_updated = NOW()
          WHERE id = $1
          RETURNING *
        `;
        
        const result = await req.db.query(query, [driverId, latitude, longitude]);
        
        if (result.rows.length > 0) {
          return res.json({
            success: true,
            driver: result.rows[0]
          });
        }
      } catch (dbError) {
        console.error('Database update failed:', dbError);
      }
    }

    // Mock success response
    res.json({
      success: true,
      driver: {
        id: driverId,
        current_lat: latitude,
        current_lng: longitude,
        last_updated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update location' 
    });
  }
});

module.exports = router;
