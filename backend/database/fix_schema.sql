-- Database Schema Fix Script
-- This fixes the missing payment_id column and foreign key constraints

-- 1. First, check if tables exist and create them if they don't
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    booking_id INTEGER,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'JPY',
    provider VARCHAR(50) NOT NULL, -- 'stripe', 'square', 'paypay'
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(255) UNIQUE NOT NULL,
    customer_name VARCHAR(255),
    pickup_station VARCHAR(255),
    pickup_location JSONB,
    destination VARCHAR(255),
    fare DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    driver_id INTEGER,
    payment_id VARCHAR(255), -- This was missing!
    train_sync_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create drivers table if it doesn't exist
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    driver_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    license_number VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    current_location JSONB,
    status VARCHAR(50) DEFAULT 'offline', -- 'online', 'offline', 'busy'
    vehicle_info JSONB,
    rating DECIMAL(3,2) DEFAULT 5.0,
    total_rides INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create ride_history table
CREATE TABLE IF NOT EXISTS ride_history (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id),
    driver_id INTEGER REFERENCES drivers(id),
    payment_id VARCHAR(255) REFERENCES payments(payment_id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    fare DECIMAL(10,2),
    distance_km DECIMAL(8,2),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Add missing foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Add foreign key from bookings to payments if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_bookings_payment_id'
    ) THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT fk_bookings_payment_id 
        FOREIGN KEY (payment_id) REFERENCES payments(payment_id);
    END IF;

    -- Add foreign key from bookings to drivers if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_bookings_driver_id'
    ) THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT fk_bookings_driver_id 
        FOREIGN KEY (driver_id) REFERENCES drivers(id);
    END IF;
END $$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_payment_id ON bookings(payment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_ride_history_booking_id ON ride_history(booking_id);

-- 7. Insert some sample data for testing (optional)
INSERT INTO drivers (driver_id, name, status, current_location, vehicle_info) 
VALUES 
    ('driver_001', '田中太郎', 'online', '{"latitude": 35.6812, "longitude": 139.7671}', '{"make": "Toyota", "model": "Prius", "plate": "品川123あ1234"}'),
    ('driver_002', '佐藤花子', 'online', '{"latitude": 35.6895, "longitude": 139.6917}', '{"make": "Honda", "model": "Freed", "plate": "品川456か5678"}'),
    ('driver_003', '鈴木一郎', 'offline', '{"latitude": 35.6762, "longitude": 139.6503}', '{"make": "Nissan", "model": "Serena", "plate": "品川789さ9012"}')
ON CONFLICT (driver_id) DO NOTHING;

-- 8. Create trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Verify the schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('bookings', 'payments', 'drivers', 'ride_history')
ORDER BY table_name, ordinal_position;
