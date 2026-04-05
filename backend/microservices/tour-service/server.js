const { startService } = require('../common/start-service');
const tourRoutes = require('../../src/routes/tour.routes');

startService({
  serviceName: 'tour-service',
  portEnv: 'TOUR_SERVICE_PORT',
  defaultPort: 5002,
  routes: [{ path: '/api/tours', router: tourRoutes }]
});
