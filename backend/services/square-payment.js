const axios = require('axios');

class SquarePaymentService {
  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://connect.squareup.com' 
      : 'https://connect.squareupsandbox.com';
    this.accessToken = process.env.SQUARE_ACCESS_TOKEN;
    this.locationId = process.env.SQUARE_LOCATION_ID;
  }

  async createPayment(amount, sourceId, customerId = null) {
    try {
      const response = await axios.post(
        `${this.baseURL}/v2/payments`,
        {
          source_id: sourceId,
          amount_money: {
            amount: amount,
            currency: 'JPY'
          },
          location_id: this.locationId,
          reference_id: `taxi-${Date.now()}`
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'Square-Version': '2023-10-18'
          }
        }
      );

      return {
        success: true,
        paymentId: response.data.payment.id,
        status: response.data.payment.status,
        receiptUrl: response.data.payment.receipt_url || null
      };
    } catch (error) {
      console.error('Square payment error:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || error.message
      };
    }
  }

  async getPayment(paymentId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/v2/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Square-Version': '2023-10-18'
          }
        }
      );

      return {
        success: true,
        payment: response.data.payment
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || error.message
      };
    }
  }
}

module.exports = new SquarePaymentService();
