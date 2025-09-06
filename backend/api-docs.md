# 全国AIタクシー API Documentation

## Base URL
- Production: `https://tokyo-taxi-ai-backend-production.up.railway.app`
- Development: `http://localhost:8080`

## Authentication
Currently no authentication required (will add JWT in future)

## Endpoints

### Health Check
- **GET** `/health`
- Returns server health status

### Train APIs
- **GET** `/api/trains/schedule?station={stationId}`
- **POST** `/api/trains/delays`
- **POST** `/api/trains/sync`

### Booking APIs
- **POST** `/api/bookings/create`
- **GET** `/api/bookings/{id}`
- **GET** `/api/bookings?userId={userId}&status={status}`
- **PUT** `/api/bookings/{id}/status`

### Driver APIs
- **GET** `/api/drivers/nearby?lat={lat}&lng={lng}&radius={radius}`
- **GET** `/api/drivers/online`
- **POST** `/api/drivers/{id}/location`
- **PUT** `/api/drivers/{id}/status`

### Payment APIs
- **GET** `/api/payment/test`
- **POST** `/api/payment/credit-card`
- **POST** `/api/payment/ic-card`
- **POST** `/api/payment/calculate-fare`

### Station APIs
- **GET** `/api/stations?region={region}&limit={limit}`
- **GET** `/api/stations/search?q={query}`
- **GET** `/api/stations/nearby?lat={lat}&lng={lng}`

### AI Recommendation APIs
- **GET** `/api/ai/hotspots?driverId={id}&lat={lat}&lng={lng}`
- **GET** `/api/ai/demand-forecast?region={region}&date={date}`

### Weather API
- **GET** `/api/weather?lat={lat}&lng={lng}`

### WebSocket Events

#### Client Events
- `join`: Join room as customer or driver
- `driver_location_update`: Update driver location
- `accept_booking`: Accept a booking
- `start_ride`: Start a ride
- `complete_ride`: Complete a ride

#### Server Events
- `new_booking`: New booking created
- `driver_moved`: Driver location changed
- `booking_accepted`: Booking accepted by driver
- `ride_started`: Ride has started
- `ride_completed`: Ride completed
