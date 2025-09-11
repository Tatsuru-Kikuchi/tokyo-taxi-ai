// PaymentService.js - Simplified, error-free version
class PaymentService {
  constructor() {
    this.stripe = null;
    this.square = null;
    this.initialized = false;
    this.initializeServices();
  }

  initializeServices() {
    console.log('Initializing payment services...');

    // Stripe initialization
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        this.stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        console.log('💳 Stripe Payment Service initialized');
      } else {
        console.log('⚠️ Stripe: No secret key provided');
      }
    } catch (error) {
      console.log('⚠️ Stripe SDK not available:', error.message);
    }

    // Square initialization
    try {
      if (process.env.SQUARE_ACCESS_TOKEN) {
        const { Client, Environment } = require('square');
        this.square = new Client({
          accessToken: process.env.SQUARE_ACCESS_TOKEN,
          environment: process.env.NODE_ENV === 'production'
            ? Environment.Production
            : Environment.Sandbox,
        });
        console.log('💳 Square Payment Service initialized');
      } else {
        console.log('⚠️ Square: No access token provided');
      }
    } catch (error) {
      console.log('⚠️ Square SDK not available:', error.message);
    }

    this.initialized = true;
    console.log('Payment services initialization completed');
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

  getAvailableProviders() {
    return {
      stripe: !!this.stripe,
      square: !!this.square,
      paypay: false // Disabled for stability
    };
  }

  isInitialized() {
    return this.initialized;
  }
}

module.exports = new PaymentService();
