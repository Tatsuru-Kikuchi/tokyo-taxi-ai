const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initializeDatabase() {
  try {
    console.log('🔧 Running database migration...');
    
    // Create payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        payment_id VARCHAR(255) UNIQUE NOT NULL,
        booking_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'JPY',
        provider VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add payment_id column to bookings
    await pool.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255)
    `);

    console.log('✅ Database migration completed');
  } catch (error) {
    console.log('⚠️ Database migration error (this might be expected):', error.message);
  }
}

initializeDatabase().then(() => process.exit(0));
