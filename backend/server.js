// Add this code RIGHT AFTER these lines in your server.js:
// app.use((req, res, next) => {
//   req.db = pool;
//   next();
// });

// ========================================
// DATABASE SCHEMA MIGRATION
// ========================================

async function ensureDatabaseSchema() {
  try {
    console.log('🔧 Running database schema migration...');

    // Create payments table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        payment_id VARCHAR(255) UNIQUE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'JPY',
        provider VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing payment_id column to bookings table
    await pool.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255)
    `);

    // Create drivers table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        driver_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'offline',
        current_location JSONB,
        rating DECIMAL(3,2) DEFAULT 5.0,
        total_rides INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bookings table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        booking_id VARCHAR(255) UNIQUE NOT NULL,
        customer_name VARCHAR(255),
        pickup_station VARCHAR(255),
        destination VARCHAR(255),
        fare DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'pending',
        driver_id INTEGER REFERENCES drivers(id),
        payment_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database schema migration completed successfully');
  } catch (error) {
    console.log('⚠️ Database migration error (this may be expected):', error.message);
  }
}

// Run the migration after database connection
ensureDatabaseSchema();
