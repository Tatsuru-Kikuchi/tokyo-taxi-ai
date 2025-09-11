const express = require('express');
const router = express.Router();

// Conditional Stripe import
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized');
  } catch (error) {
    console.warn('⚠️ Stripe not available:', error.message);
  }
}

// Conditional PayPay import
let paypayopa = null;
if (process.env.PAYPAY_API_KEY && process.env.PAYPAY_API_SECRET && process.env.PAYPAY_MERCHANT_ID) {
  try {
    paypayopa = require('@paypayopa/paypayopa-sdk-node');
    paypayopa.Configure({
      clientId: process.env.PAYPAY_API_KEY,
      clientSecret: process.env.PAYPAY_API_SECRET,
      merchantId: process.env.PAYPAY_MERCHANT_ID,
      productionMode: process.env.NODE_ENV === 'production'
    });
    console.log('✅ PayPay SDK initialized');
  } catch (error) {
    console.warn('⚠️ PayPay SDK not available:', error.message);
  }
}

// Test all payment methods
router.get('/test', (req, res) => {
  const availableMethods = ['cash']; // Always available
  
  if (stripe) availableMethods.push('stripe');
  if (paypayopa) availableMethods.push('paypay');
  
  res.json({
    status: 'Payment system ready',
    environment: process.env.NODE_ENV || 'development',
    availableMethods: availableMethods,
    configured: {
      stripe: !!stripe,
      paypay: !!paypayopa,
      cash: true
    },
    message: 'テスト環境で動作中（実際の課金なし）',
    timestamp: new Date().toISOString()
  });
});

// Calculate fare breakdown
router.post('/calculate-fare', (req, res) => {
  try {
    const { distance, duration, surgeMultiplier = 1.0, isAirport = false } = req.body;

    if (!distance) {
      return res.status(400).json({
        success: false,
        error: 'Distance is required'
      });
    }

    const baseFare = 730; // Tokyo taxi base fare
    const distanceFare = Math.ceil(Math.max(0, distance - 1.096) / 0.255) * 90;
    const timeFare = Math.ceil((duration || 0) / 95) * 40;
    const subtotal = baseFare + distanceFare + timeFare;
    const surgeFare = Math.round(subtotal * surgeMultiplier);
    
    // Airport surcharge
    let airportSurcharge = 0;
    if (isAirport) {
      airportSurcharge = distance > 30 ? 2300 : 410; // Narita vs Haneda
    }
    
    const total = surgeFare + airportSurcharge;

    res.json({
      success: true,
      breakdown: {
        baseFare,
        distanceFare,
        timeFare,
        surgeMultiplier,
        subtotal,
        surgeFare,
        airportSurcharge,
        total
      },
      estimatedFare: total,
      currency: 'JPY',
      calculation: '初乗り + 距離料金 + 時間料金 + 需要料金'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Mock payment for cash
router.post('/cash', async (req, res) => {
  try {
    const { amount, bookingId, customerId } = req.body;

    if (!amount || !bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Amount and bookingId are required'
      });
    }

    const payment = {
      success: true,
      paymentId: `CASH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method: 'cash',
      status: 'pending_payment',
      amount: amount,
      currency: 'JPY',
      customerId: customerId,
      bookingId: bookingId,
      processedAt: new Date().toISOString(),
      message: '乗車時に現金でお支払いください'
    };

    // Save to database if available
    if (req.db) {
      try {
        await req.db.query(
          'INSERT INTO payments (id, booking_id, amount, payment_method, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [payment.paymentId, bookingId, amount, 'cash', 'pending_payment', new Date()]
        );
      } catch (dbError) {
        console.error('Database save failed:', dbError);
      }
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stripe payment intent (only if Stripe is configured)
router.post('/stripe/create-intent', async (req, res) => {
  if (!stripe) {
    return res.status(400).json({
      success: false,
      error: 'Stripe is not configured on this server'
    });
  }

  try {
    const { amount, bookingId, customerId } = req.body;
    
    if (!amount || !bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Amount and bookingId are required'
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'jpy',
      metadata: { 
        bookingId: bookingId,
        customerId: customerId || 'guest'
      },
      description: '全国AIタクシー - タクシー料金'
    });

    // Save payment record
    if (req.db) {
      try {
        await req.db.query(
          'INSERT INTO payments (booking_id, payment_method, amount, payment_id, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [bookingId, 'stripe', amount, paymentIntent.id, 'pending', new Date()]
        );
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
    }

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Stripe payment intent creation error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// PayPay payment (only if PayPay is configured)
router.post('/paypay/create', async (req, res) => {
  if (!paypayopa) {
    return res.status(400).json({
      success: false,
      error: 'PayPay is not configured on this server'
    });
  }

  try {
    const { bookingId, customerId, fare, pickup, destination } = req.body;

    if (!bookingId || !customerId || !fare || !pickup || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bookingId, customerId, fare, pickup, destination'
      });
    }

    if (fare < 100 || fare > 100000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid fare amount. Must be between ¥100 and ¥100,000'
      });
    }

    const merchantPaymentId = `ZK_${bookingId}_${Date.now()}`;
    
    const payload = {
      merchantPaymentId: merchantPaymentId,
      codeType: 'ORDER_QR',
      amount: {
        amount: Math.round(fare),
        currency: 'JPY'
      },
      orderDescription: `全国AIタクシー - ${pickup} → ${destination}`,
      isAuthorization: false,
      redirectUrl: 'https://zenkoku-ai-taxi.jp/payment/success',
      redirectType: 'WEB_LINK',
      userAgent: 'MOBILE_APP'
    };

    const response = await paypayopa.QRCodeCreate(payload);
    
    if (response.BODY && response.BODY.resultInfo.code === 'SUCCESS') {
      // Save payment record
      if (req.db) {
        try {
          await req.db.query(
            'INSERT INTO payments (booking_id, payment_method, amount, payment_id, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [bookingId, 'paypay', fare, merchantPaymentId, 'pending', new Date()]
          );
        } catch (dbError) {
          console.error('Database save error:', dbError);
        }
      }

      res.json({
        success: true,
        paymentId: merchantPaymentId,
        qrCodeUrl: response.BODY.data.qrCodeUrl,
        deeplink: response.BODY.data.url,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        instructions: 'PayPayアプリでQRコードをスキャンして支払いを完了してください'
      });
    } else {
      throw new Error(response.BODY?.resultInfo?.message || 'PayPay payment creation failed');
    }
  } catch (error) {
    console.error('PayPay payment creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
