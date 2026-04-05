const { startService } = require('../common/start-service');
const adminRoutes = require('../../src/routes/admin.routes');

startService({
  serviceName: 'admin-service',
  portEnv: 'ADMIN_SERVICE_PORT',
  defaultPort: 5010,
  routes: [{ path: '/api/admin', router: adminRoutes }]
});
