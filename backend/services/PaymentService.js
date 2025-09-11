// backend/services/PaymentService.js
const paypayopa = require('@paypayopa/paypayopa-sdk-node');

class PaymentService {
  constructor() {
    // Initialize PayPay SDK
    paypayopa.Configure({
      clientId: process.env.PAYPAY_API_KEY,
      clientSecret: process.env.PAYPAY_API_SECRET,
      merchantId: process.env.PAYPAY_MERCHANT_ID,
      productionMode: process.env.NODE_ENV === 'production'
    });
  }

  async createPayPayPayment(bookingData) {
    try {
      const payload = {
        merchantPaymentId: `ZK_${bookingData.bookingId}_${Date.now()}`,
        codeType: 'ORDER_QR',
        amount: {
          amount: bookingData.fare,
          currency: 'JPY'
        },
        orderDescription: `全国AIタクシー - ${bookingData.pickup} → ${bookingData.destination}`,
        isAuthorization: false,
        redirectUrl: `https://zenkoku-ai-taxi.jp/payment/success`,
        redirectType: 'WEB_LINK',
        userAgent: 'MOBILE_APP',
        storeInfo: bookingData.driver?.name || '全国AIタクシー',
        metadata: {
          bookingId: bookingData.bookingId,
          customerId: bookingData.customerId,
          driverId: bookingData.driverId
        }
      };

      const response = await paypayopa.QRCodeCreate(payload);
      
      if (response.BODY && response.BODY.resultInfo.code === 'SUCCESS') {
        return {
          success: true,
          paymentId: response.BODY.merchantPaymentId,
          qrCodeUrl: response.BODY.data.qrCodeUrl,
          deeplink: response.BODY.data.url,
          codeId: response.BODY.data.codeId,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        };
      } else {
        throw new Error(response.BODY?.resultInfo?.message || 'PayPay payment creation failed');
      }
    } catch (error) {
      console.error('PayPay payment creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkPaymentStatus(merchantPaymentId) {
    try {
      const response = await paypayopa.GetPaymentDetails(merchantPaymentId);
      
      if (response.BODY && response.BODY.resultInfo.code === 'SUCCESS') {
        const status = response.BODY.data.status;
        return {
          success: true,
          status: status, // CREATED, AUTHORIZED, CAPTURED, FAILED, CANCELED
          amount: response.BODY.data.amount,
          paymentDate: response.BODY.data.acceptedAt
        };
      } else {
        return {
          success: false,
          error: response.BODY?.resultInfo?.message || 'Status check failed'
        };
      }
    } catch (error) {
      console.error('PayPay status check error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async refundPayment(merchantPaymentId, refundAmount) {
    try {
      const payload = {
        merchantRefundId: `REF_${merchantPaymentId}_${Date.now()}`,
        paymentId: merchantPaymentId,
        amount: {
          amount: refundAmount,
          currency: 'JPY'
        },
        reason: 'キャンセル・返金'
      };

      const response = await paypayopa.RefundPayment(payload);
      
      if (response.BODY && response.BODY.resultInfo.code === 'SUCCESS') {
        return {
          success: true,
          refundId: response.BODY.data.refundId,
          status: response.BODY.data.status
        };
      } else {
        throw new Error(response.BODY?.resultInfo?.message || 'Refund failed');
      }
    } catch (error) {
      console.error('PayPay refund error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async capturePayment(merchantPaymentId, amount) {
    try {
      const payload = {
        merchantPaymentId: merchantPaymentId,
        amount: {
          amount: amount,
          currency: 'JPY'
        },
        merchantCaptureId: `CAP_${merchantPaymentId}_${Date.now()}`,
        requestedAt: Math.floor(Date.now() / 1000)
      };

      const response = await paypayopa.CapturePaymentAuth(payload);
      
      if (response.BODY && response.BODY.resultInfo.code === 'SUCCESS') {
        return {
          success: true,
          captureId: response.BODY.data.captureId,
          status: response.BODY.data.status
        };
      } else {
        throw new Error(response.BODY?.resultInfo?.message || 'Capture failed');
      }
    } catch (error) {
      console.error('PayPay capture error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PaymentService;
