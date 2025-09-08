const testBackend = async () => {
  const base = 'https://tokyo-taxi-ai-backend-production.up.railway.app';
  
  try {
    console.log('1. Testing health...');
    const healthRes = await fetch(`${base}/health`);
    console.log('Health status:', healthRes.status);
    const health = await healthRes.json();
    console.log('Health response:', health);
  } catch (error) {
    console.log('Health check failed:', error.message);
  }
  
  try {
    console.log('\n2. Testing drivers...');
    const driversRes = await fetch(`${base}/api/drivers/nearby?lat=35.6812&lng=139.7671`);
    console.log('Drivers status:', driversRes.status);
    const drivers = await driversRes.json();
    console.log('Number of drivers:', drivers.drivers ? drivers.drivers.length : 0);
  } catch (error) {
    console.log('Drivers check failed:', error.message);
  }
  
  try {
    console.log('\n3. Testing booking...');
    const bookingRes = await fetch(`${base}/api/bookings/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickup: 'Test Station', dropoff: 'Test Destination' })
    });
    console.log('Booking status:', bookingRes.status);
    const booking = await bookingRes.json();
    console.log('Booking response:', booking);
  } catch (error) {
    console.log('Booking check failed:', error.message);
  }
};

testBackend();
