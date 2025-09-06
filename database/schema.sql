-- /backend/database/schema.sql
CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  rating DECIMAL(2,1),
  is_online BOOLEAN DEFAULT false,
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  pickup_station VARCHAR(255),
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  destination VARCHAR(500),
  driver_id INTEGER REFERENCES drivers(id),
  fare INTEGER,
  status VARCHAR(50), -- 'pending', 'accepted', 'completed', 'cancelled'
  confirmation_code VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  amount INTEGER,
  payment_method VARCHAR(50),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
