const { Client, Environment } = require('square');

class SquarePaymentService {
  constructor() {
    try {
      this.client = new Client({
        accessToken: process.env.SQUARE_ACCESS_TOKEN || "EAAAlyq9gGAbEBVYkjw6K6emJ0uMGzv6_pvr1VAK1zijai-oxytvuSK481nLtxkp",
        environment: Environment.Sandbox
      });
      
      this.locationId = process.env.SQUARE_LOCATION_ID || "LNEWVTK44Y8KT";
      console.log('✅ Square Payment Service initialized');
    } catch (error) {
      console.error('Square initialization error:', error);
      // Continue without Square for now
      this.client = null;
    }
  }

  async processCreditCard(nonce, amount, customerId, rideDetails = {}) {
    if (!this.client) {
      return { success: false, error: 'Payment service not available' };
    }
    
    try {
      const idempotencyKey = `${customerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const paymentRequest = {
        sourceId: nonce,
        idempotencyKey: idempotencyKey,
        amountMoney: {
          amount: Math.round(amount),
          currency: 'JPY'
        },
        locationId: this.locationId,
        referenceId: `TAXI_${customerId}_${Date.now()}`,
        note: `全国AIタクシー - ${rideDetails.from || ''}→${rideDetails.to || ''}`
      };

      const response = await this.client.paymentsApi.createPayment(paymentRequest);
      
      return {
        success: true,
        paymentId: response.result.payment.id,
        status: response.result.payment.status,
        receiptUrl: response.result.payment.receiptUrl
      };
    } catch (error) {
      console.error('Payment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processICCard(nonce, amount, customerId, cardType) {
    if (!this.client) {
      return { success: false, error: 'Payment service not available' };
    }
    
    try {
      const idempotencyKey = `IC_${customerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const paymentRequest = {
        sourceId: nonce,
        idempotencyKey: idempotencyKey,
        amountMoney: {
          amount: Math.round(amount),
          currency: 'JPY'
        },
        locationId: this.locationId,
        referenceId: `IC_TAXI_${customerId}_${Date.now()}`,
        note: `IC Card Payment - ${cardType}`
      };

      const response = await this.client.paymentsApi.createPayment(paymentRequest);
      
      return {
        success: true,
        paymentId: response.result.payment.id,
        cardType: cardType,
        status: response.result.payment.status
      };
    } catch (error) {
      console.error('IC payment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SquarePaymentService();
