const { startService } = require('../common/start-service');
const uploadRoutes = require('../../src/routes/upload.routes');

startService({
  serviceName: 'upload-service',
  portEnv: 'UPLOAD_SERVICE_PORT',
  defaultPort: 5007,
  routes: [{ path: '/api/upload', router: uploadRoutes }]
});
