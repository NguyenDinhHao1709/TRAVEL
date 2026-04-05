const { startService } = require('../common/start-service');
const staffRoutes = require('../../src/routes/staff.routes');

startService({
  serviceName: 'staff-service',
  portEnv: 'STAFF_SERVICE_PORT',
  defaultPort: 5009,
  routes: [{ path: '/api/staff', router: staffRoutes }]
});
