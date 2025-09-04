app.post('/api/bookings/create', async (req, res) => {
  const booking = {
    id: generateId(),
    ...req.body,
    timestamp: new Date(),
    status: 'confirmed'
  };
  
  // Save to database
  await saveBooking(booking);
  
  res.json({ success: true, booking });
});
