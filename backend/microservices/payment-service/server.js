const { startService } = require('../common/start-service');
const paymentRoutes = require('../../src/routes/payment.routes');
const vnpayRoutes = require('../../src/routes/vnpay.routes');
const momoRoutes = require('../../src/routes/momo.routes');

startService({
  serviceName: 'payment-service',
  portEnv: 'PAYMENT_SERVICE_PORT',
  defaultPort: 5004,
  routes: [
    { path: '/api/payments', router: paymentRoutes },
    { path: '/api/payments', router: vnpayRoutes },
    { path: '/api/payments', router: momoRoutes }
  ]
});
