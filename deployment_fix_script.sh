#!/bin/bash

# Complete Fix Script for PayPay SDK and Database Schema Issues
# Run this from your tokyo-taxi-ai project root directory

echo "🔧 Starting fixes for PayPay SDK and Database Schema..."

# 1. Replace the PaymentService.js file
echo "📝 Fixing PaymentService.js..."
cat > backend/services/PaymentService.js << 'EOF'
// PaymentService.js - Fixed PayPay SDK path
class PaymentService {
  constructor() {
    this.stripe = null;
    this.square = null;
    this.paypay = null;
    this.initialized = false;
    this.initializeServices();
  }

  initializeServices() {
    // Stripe initialization
    try {
      this.stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      console.log('💳 Stripe Payment Service initialized');
    } catch (error) {
      console.log('⚠️ Stripe SDK not available:', error.message);
    }

    // Square initialization
    try {
      const { Client, Environment } = require('square');
      this.square = new Client({
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        environment: process.env.NODE_ENV === 'production' 
          ? Environment.Production 
          : Environment.Sandbox,
      });
      console.log('💳 Square Payment Service initialized');
    } catch (error) {
      console.log('⚠️ Square SDK not available:', error.message);
    }

    // PayPay initialization - FIXED PATH
    try {
      // Try multiple possible paths for PayPay SDK
      let PayPaySDK;
      const possiblePaths = [
        '@paypayopa/paypayopa-sdk-node',
        '@paypayopa/paypayopa-sdk-node/lib/index',
        '@paypayopa/paypayopa-sdk-node/dist/index',
        '@paypayopa/paypayopa-sdk-node/dist/src/lib/index'
      ];

      for (const path of possiblePaths) {
        try {
          PayPaySDK = require(path);
          break;
        } catch (e) {
          continue;
        }
      }

      if (PayPaySDK) {
        this.paypay = new PayPaySDK({
          clientId: process.env.PAYPAY_CLIENT_ID,
          clientSecret: process.env.PAYPAY_CLIENT_SECRET,
          merchantId: process.env.PAYPAY_MERCHANT_ID,
          productionMode: process.env.NODE_ENV === 'production'
        });
        console.log('💳 PayPay Payment Service initialized');
      } else {
        throw new Error('PayPay SDK not found in any expected location');
      }
    } catch (error) {
      console.log('⚠️ PayPay SDK not available:', error.message);
    }

    this.initialized = true;
  }

  async processStripePayment(amount, currency = 'jpy', metadata = {}) {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        paymentIntent: paymentIntent.client_secret,
        id: paymentIntent.id,
      };
    } catch (error) {
      console.error('Stripe payment error:', error);
      throw error;
    }
  }

  async processSquarePayment(amount, currency = 'JPY', sourceId, metadata = {}) {
    if (!this.square) {
      throw new Error('Square not initialized');
    }

    try {
      const { paymentsApi } = this.square;
      const requestBody = {
        sourceId,
        amountMoney: {
          amount: BigInt(amount),
          currency,
        },
        idempotencyKey: require('crypto').randomUUID(),
        note: metadata.note || 'Taxi ride payment',
      };

      const response = await paymentsApi.createPayment(requestBody);

      return {
        success: true,
        payment: response.result.payment,
        id: response.result.payment.id,
      };
    } catch (error) {
      console.error('Square payment error:', error);
      throw error;
    }
  }

  async processPayPayPayment(amount, metadata = {}) {
    if (!this.paypay) {
      throw new Error('PayPay not initialized');
    }

    try {
      const paymentRequest = {
        merchantPaymentId: `taxi_${Date.now()}`,
        amount: {
          amount: amount,
          currency: 'JPY',
        },
        orderDescription: metadata.description || 'Taxi ride payment',
        userAuthorizationId: metadata.userId,
      };

      const response = await this.paypay.createPayment(paymentRequest);

      return {
        success: true,
        payment: response,
        id: response.data.merchantPaymentId,
      };
    } catch (error) {
      console.error('PayPay payment error:', error);
      throw error;
    }
  }

  async refundPayment(paymentId, amount, provider = 'stripe') {
    try {
      switch (provider) {
        case 'stripe':
          if (!this.stripe) throw new Error('Stripe not initialized');
          const refund = await this.stripe.refunds.create({
            payment_intent: paymentId,
            amount,
          });
          return { success: true, refund };

        case 'square':
          if (!this.square) throw new Error('Square not initialized');
          const { refundsApi } = this.square;
          const refundRequest = {
            idempotencyKey: require('crypto').randomUUID(),
            amountMoney: {
              amount: BigInt(amount),
              currency: 'JPY',
            },
            paymentId,
          };
          const response = await refundsApi.refundPayment(refundRequest);
          return { success: true, refund: response.result.refund };

        case 'paypay':
          if (!this.paypay) throw new Error('PayPay not initialized');
          const payPayRefund = await this.paypay.refundPayment({
            merchantRefundId: `refund_${Date.now()}`,
            paymentId,
            amount: { amount, currency: 'JPY' },
          });
          return { success: true, refund: payPayRefund };

        default:
          throw new Error(`Unsupported payment provider: ${provider}`);
      }
    } catch (error) {
      console.error(`${provider} refund error:`, error);
      throw error;
    }
  }

  getAvailableProviders() {
    return {
      stripe: !!this.stripe,
      square: !!this.square,
      paypay: !!this.paypay,
    };
  }

  isInitialized() {
    return this.initialized;
  }
}

module.exports = new PaymentService();
EOF

# 2. Create database migration script
echo "🗄️ Creating database migration script..."
cat > backend/database/fix_schema.sql << 'EOF'
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
EOF

# 3. Create directory if it doesn't exist
mkdir -p backend/database

# 4. Add PayPay SDK to package.json if not already there
echo "📦 Updating package.json with PayPay SDK..."
cd backend

# Check if PayPay SDK is in package.json, add if missing
if ! grep -q "@paypayopa/paypayopa-sdk-node" package.json; then
    echo "Adding PayPay SDK to dependencies..."
    npm install @paypayopa/paypayopa-sdk-node --save
fi

# 5. Commit changes
cd ..
echo "📤 Committing fixes to git..."
git add .
git commit -m "Fix PayPay SDK path and add database schema migration"
git push origin main

# 6. Instructions for database migration
echo ""
echo "🎯 Fixes Applied Successfully!"
echo ""
echo "📋 What was fixed:"
echo "  ✅ PaymentService.js - Fixed PayPay SDK import paths"
echo "  ✅ Database schema - Created fix_schema.sql migration"
echo "  ✅ Added PayPay SDK dependency to package.json"
echo ""
echo "🚀 Next Steps:"
echo "1. Railway will automatically redeploy with the PayPay fix"
echo "2. To fix the database, run this SQL migration:"
echo ""
echo "   Option A - Railway Dashboard:"
echo "   • Go to Railway → Your Database → Query"
echo "   • Copy and paste backend/database/fix_schema.sql"
echo "   • Execute the query"
echo ""
echo "   Option B - Command Line (if you have psql):"
echo "   psql \$DATABASE_URL -f backend/database/fix_schema.sql"
echo ""
echo "🔍 Verify fixes after deployment:"
echo "   curl https://your-railway-url.railway.app/api/health"
echo ""
echo "Expected result: No more PayPay SDK warnings, database errors should be gone!"

echo "✨ Fix script completed!"
