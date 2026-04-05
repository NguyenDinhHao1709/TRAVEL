const { startService } = require('../common/start-service');
const bookingRoutes = require('../../src/routes/booking.routes');

startService({
  serviceName: 'booking-service',
  portEnv: 'BOOKING_SERVICE_PORT',
  defaultPort: 5003,
  routes: [{ path: '/api/bookings', router: bookingRoutes }]
});
