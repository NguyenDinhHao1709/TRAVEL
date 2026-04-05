const { startService } = require('../common/start-service');
const wishlistRoutes = require('../../src/routes/wishlist.routes');

startService({
  serviceName: 'wishlist-service',
  portEnv: 'WISHLIST_SERVICE_PORT',
  defaultPort: 5005,
  routes: [{ path: '/api/wishlists', router: wishlistRoutes }]
});
