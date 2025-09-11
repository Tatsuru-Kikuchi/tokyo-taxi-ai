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
