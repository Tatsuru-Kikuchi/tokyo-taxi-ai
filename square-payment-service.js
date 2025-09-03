const { Client, Environment } = require('square');

class SquarePaymentService {
  constructor() {
    // Using YOUR Sandbox credentials
    this.client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN || "EAAAlyq9gGAbEBVYkjw6K6emJ0uMGzv6_pvr1VAK1zijai-oxytvuSK481nLtxkp",
      environment: Environment.Sandbox // Using Sandbox for testing
    });
    
    this.locationId = process.env.SQUARE_LOCATION_ID || "LNEWVTK44Y8KT";
  }

  // Rest of the service code remains the same...
  // [Include all the methods from the previous square-payment-service.js]
}

module.exports = new SquarePaymentService();
