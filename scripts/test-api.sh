#!/bin/bash

# Test script for 全国AIタクシー API
API_URL="https://tokyo-taxi-ai-backend-production.up.railway.app"

echo "🧪 Testing 全国AIタクシー API..."

# Health check
echo "1. Health Check:"
curl -s "$API_URL/health" | json_pp

# Get train schedule
echo -e "\n2. Train Schedule:"
curl -s "$API_URL/api/trains/schedule?station=tokyo" | json_pp

# Get nearby drivers
echo -e "\n3. Nearby Drivers:"
curl -s "$API_URL/api/drivers/nearby?lat=35.6812&lng=139.7671" | json_pp

# Test payment
echo -e "\n4. Payment Test:"
curl -s "$API_URL/api/payment/test" | json_pp

# Create booking
echo -e "\n5. Create Booking:"
curl -s -X POST "$API_URL/api/bookings/create" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": "東京駅",
    "dropoff": "渋谷駅",
    "userId": "test123",
    "estimatedFare": 2800
  }' | json_pp

echo -e "\n✅ API tests complete!"
