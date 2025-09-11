// services/tracking.js - PostgreSQL Compatible
const WebSocket = require('ws');
const EventEmitter = require('events');

class TrackingService extends EventEmitter {
  constructor(pool = null) {
    super();
    this.pool = pool; // PostgreSQL connection pool
    this.connections = new Map(); // driverId -> ws connection
    this.driverLocations = new Map(); // driverId -> {lat, lng, timestamp}
    this.activeRides = new Map(); // rideId -> {driverId, customerId, route}
    this.customerConnections = new Map(); // customerId -> ws connection
  }

  initialize(server) {
    // Create WebSocket server for real-time tracking
    this.wss = new WebSocket.Server({
      server,
      path: '/ws/tracking'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('🔌 New WebSocket connection');

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('❌ Invalid WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('🔌 WebSocket error:', error);
      });
    });

    console.log('🚀 Real-time tracking service initialized (PostgreSQL)');
  }

  handleMessage(ws, message) {
    const { type, data } = message;

    switch (type) {
      case 'driver_connect':
        this.connectDriver(ws, data);
        break;

      case 'customer_connect':
        this.connectCustomer(ws, data);
        break;

      case 'location_update':
        this.updateDriverLocation(ws, data);
        break;

      case 'ride_start':
        this.startRideTracking(data);
        break;

      case 'ride_end':
        this.endRideTracking(data);
        break;

      case 'request_nearby_drivers':
        this.sendNearbyDrivers(ws, data);
        break;

      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  connectDriver(ws, data) {
    const { driverId, driverName } = data;

    if (!driverId) {
      return this.sendError(ws, 'Driver ID required');
    }

    // Store driver connection
    ws.driverId = driverId;
    ws.userType = 'driver';
    this.connections.set(driverId, ws);

    // Initialize driver location if not exists
    if (!this.driverLocations.has(driverId)) {
      this.driverLocations.set(driverId, {
        lat: null,
        lng: null,
        timestamp: new Date(),
        status: 'online'
      });
    }

    this.sendSuccess(ws, 'driver_connected', {
      message: `Driver ${driverName} connected successfully`
    });

    console.log(`🚗 Driver connected: ${driverName} (${driverId})`);

    // Emit event for other services
    this.emit('driverConnected', { driverId, driverName });
  }

  connectCustomer(ws, data) {
    const { customerId, rideId } = data;

    if (!customerId) {
      return this.sendError(ws, 'Customer ID required');
    }

    ws.customerId = customerId;
    ws.userType = 'customer';
    ws.rideId = rideId;

    this.customerConnections.set(customerId, ws);

    this.sendSuccess(ws, 'customer_connected', {
      message: 'Customer connected successfully'
    });

    console.log(`👤 Customer connected: ${customerId}`);

    // If customer is tracking a ride, send current driver location
    if (rideId && this.activeRides.has(rideId)) {
      const ride = this.activeRides.get(rideId);
      const driverLocation = this.driverLocations.get(ride.driverId);

      if (driverLocation) {
        this.sendToCustomer(customerId, 'driver_location', driverLocation);
      }
    }
  }

  updateDriverLocation(ws, data) {
    const { lat, lng } = data;
    const driverId = ws.driverId;

    if (!driverId) {
      return this.sendError(ws, 'Driver not authenticated');
    }

    if (!lat || !lng) {
      return this.sendError(ws, 'Invalid location data');
    }

    // Update driver location
    const locationData = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      timestamp: new Date(),
      status: 'online'
    };

    this.driverLocations.set(driverId, locationData);

    // Update PostgreSQL database (async, non-blocking)
    this.updateDriverLocationInDB(driverId, locationData).catch(error => {
      console.error('❌ Database location update failed:', error);
    });

    // Broadcast to customers tracking this driver
    this.broadcastDriverLocation(driverId, locationData);

    // Send confirmation to driver
    this.sendSuccess(ws, 'location_updated', {
      timestamp: locationData.timestamp
    });
  }

  async updateDriverLocationInDB(driverId, locationData) {
    // Update location in PostgreSQL
    try {
      if (this.pool) {
        await this.pool.query(
          `UPDATE drivers
           SET current_lat = $1, current_lng = $2, last_updated = NOW()
           WHERE id = $3`,
          [locationData.lat, locationData.lng, driverId]
        );
      }

      console.log(`📍 Location updated for driver ${driverId} in PostgreSQL`);
    } catch (error) {
      console.error('❌ PostgreSQL update error:', error);
      throw error;
    }
  }

  broadcastDriverLocation(driverId, locationData) {
    // Find all active rides for this driver
    for (const [rideId, ride] of this.activeRides) {
      if (ride.driverId === driverId) {
        // Send location to customer tracking this ride
        this.sendToCustomer(ride.customerId, 'driver_location', {
          ...locationData,
          rideId,
          driverId
        });
      }
    }
  }

  startRideTracking(data) {
    const { rideId, driverId, customerId } = data;

    if (!rideId || !driverId || !customerId) {
      console.error('❌ Invalid ride tracking data');
      return;
    }

    // Store active ride
    this.activeRides.set(rideId, {
      driverId,
      customerId,
      startTime: new Date(),
      route: []
    });

    // Notify both driver and customer
    this.sendToDriver(driverId, 'ride_started', { rideId, customerId });
    this.sendToCustomer(customerId, 'ride_started', { rideId, driverId });

    console.log(`🚕 Ride tracking started: ${rideId}`);

    // Emit event for other services
    this.emit('rideStarted', { rideId, driverId, customerId });
  }

  endRideTracking(data) {
    const { rideId } = data;

    if (!this.activeRides.has(rideId)) {
      console.error(`❌ Ride not found: ${rideId}`);
      return;
    }

    const ride = this.activeRides.get(rideId);
    ride.endTime = new Date();

    // Notify both parties
    this.sendToDriver(ride.driverId, 'ride_ended', { rideId });
    this.sendToCustomer(ride.customerId, 'ride_ended', { rideId });

    // Remove from active rides
    this.activeRides.delete(rideId);

    console.log(`🏁 Ride tracking ended: ${rideId}`);

    // Emit event for other services
    this.emit('rideEnded', { rideId, ride });
  }

  async sendNearbyDrivers(ws, data) {
    const { lat, lng, radius = 5000 } = data;

    if (!lat || !lng) {
      return this.sendError(ws, 'Location required');
    }

    try {
      // Find nearby drivers using PostgreSQL
      let nearbyDrivers = [];

      if (this.pool) {
        const query = `
          SELECT
            id, name, current_lat as lat, current_lng as lng, rating,
            SQRT(POW(69.1 * (current_lat - $1), 2) +
                 POW(69.1 * ($2 - current_lng) * COS(current_lat / 57.3), 2)) * 1000 AS distance
          FROM drivers
          WHERE is_online = true
            AND current_lat IS NOT NULL
            AND current_lng IS NOT NULL
          ORDER BY distance
          LIMIT 10
        `;

        const result = await this.pool.query(query, [lat, lng]);
        nearbyDrivers = result.rows.filter(d => d.distance <= radius);
      } else {
        // Fallback to in-memory
        nearbyDrivers = this.findNearbyDrivers(lat, lng, radius);
      }

      this.sendSuccess(ws, 'nearby_drivers', {
        drivers: nearbyDrivers,
        count: nearbyDrivers.length
      });
    } catch (error) {
      console.error('❌ Error finding nearby drivers:', error);
      this.sendError(ws, 'Failed to find nearby drivers');
    }
  }

  findNearbyDrivers(customerLat, customerLng, radius) {
    const nearby = [];

    for (const [driverId, location] of this.driverLocations) {
      if (!location.lat || !location.lng) continue;

      const distance = this.calculateDistance(
        customerLat, customerLng,
        location.lat, location.lng
      );

      if (distance <= radius) {
        nearby.push({
          driverId,
          location: {
            lat: location.lat,
            lng: location.lng
          },
          distance: Math.round(distance),
          status: location.status,
          lastUpdate: location.timestamp
        });
      }
    }

    // Sort by distance
    return nearby.sort((a, b) => a.distance - b.distance);
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    // Haversine formula for distance calculation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  sendToDriver(driverId, type, data) {
    const ws = this.connections.get(driverId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  }

  sendToCustomer(customerId, type, data) {
    const ws = this.customerConnections.get(customerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  }

  sendSuccess(ws, type, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type,
        success: true,
        data
      }));
    }
  }

  sendError(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        success: false,
        message
      }));
    }
  }

  handleDisconnection(ws) {
    if (ws.userType === 'driver' && ws.driverId) {
      this.connections.delete(ws.driverId);
      console.log(`🚗 Driver disconnected: ${ws.driverId}`);

      // Emit event for other services
      this.emit('driverDisconnected', { driverId: ws.driverId });

    } else if (ws.userType === 'customer' && ws.customerId) {
      this.customerConnections.delete(ws.customerId);
      console.log(`👤 Customer disconnected: ${ws.customerId}`);
    }
  }

  // Get status information
  getStatus() {
    return {
      connectedDrivers: this.connections.size,
      connectedCustomers: this.customerConnections.size,
      activeRides: this.activeRides.size,
      totalLocations: this.driverLocations.size,
      database: this.pool ? 'PostgreSQL' : 'In-Memory'
    };
  }

  // Cleanup inactive connections
  cleanup() {
    const now = new Date();
    const timeoutMs = 5 * 60 * 1000; // 5 minutes

    // Remove stale location data
    for (const [driverId, location] of this.driverLocations) {
      if (now - location.timestamp > timeoutMs) {
        this.driverLocations.delete(driverId);
        console.log(`🧹 Cleaned up stale location for driver: ${driverId}`);
      }
    }
  }
}

module.exports = TrackingService;
// Deploy trigger: Mon Sep  8 20:49:18 JST 2025
