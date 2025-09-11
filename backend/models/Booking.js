const bookingSchema = {
  id: String,
  customerId: String,
  driverId: String,
  pickup: {
    station: String,
    coordinates: [Number],
    address: String
  },
  destination: {
    address: String,
    coordinates: [Number]
  },
  fare: Number,
  distance: Number,
  duration: Number,
  status: String, // 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'
  paymentMethod: String,
  paymentStatus: String,
  createdAt: Date,
  completedAt: Date
};
