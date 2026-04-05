const { startService } = require('../common/start-service');
const authRoutes = require('../../src/routes/auth.routes');

startService({
  serviceName: 'auth-service',
  portEnv: 'AUTH_SERVICE_PORT',
  defaultPort: 5001,
  routes: [{ path: '/api/auth', router: authRoutes }]
});
