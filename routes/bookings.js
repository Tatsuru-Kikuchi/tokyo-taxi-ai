// /backend/routes/bookings.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Your PostgreSQL connection

// Create booking
router.post('/create', async (req, res) => {
  try {
    const { 
      customerName, 
      customerPhone, 
      pickupStation, 
      pickupLat,
      pickupLng,
      destination, 
      fare 
    } = req.body;
    
    // Generate confirmation code
    const confirmationCode = 'ZK' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    const query = `
      INSERT INTO bookings 
      (customer_name, customer_phone, pickup_station, pickup_lat, pickup_lng, destination, fare, status, confirmation_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      customerName, customerPhone, pickupStation, pickupLat, pickupLng, destination, fare, confirmationCode
    ]);
    
    res.json({
      success: true,
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get booking status
router.get('/:confirmationCode', async (req, res) => {
  try {
    const { confirmationCode } = req.params;
    
    const query = `
      SELECT b.*, d.name as driver_name, d.phone as driver_phone
      FROM bookings b
      LEFT JOIN drivers d ON b.driver_id = d.id
      WHERE b.confirmation_code = $1
    `;
    
    const result = await pool.query(query, [confirmationCode]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({
      success: true,
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to get booking' });
  }
});

module.exports = router;
