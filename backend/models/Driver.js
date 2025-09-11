const driverSchema = {
  id: String,
  name: String,
  phone: String,
  email: String,
  vehicle: {
    make: String,
    model: String,
    plateNumber: String,
    color: String
  },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [lng, lat]
  },
  status: String, // 'online', 'offline', 'busy'
  currentRide: String,
  rating: Number,
  totalRides: Number,
  earnings: {
    today: Number,
    week: Number,
    month: Number
  },
  createdAt: Date,
  updatedAt: Date
};
