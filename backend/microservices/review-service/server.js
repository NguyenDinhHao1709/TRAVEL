const { startService } = require('../common/start-service');
const reviewRoutes = require('../../src/routes/review.routes');

startService({
  serviceName: 'review-service',
  portEnv: 'REVIEW_SERVICE_PORT',
  defaultPort: 5006,
  routes: [{ path: '/api/reviews', router: reviewRoutes }]
});
