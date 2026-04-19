const express = require('express');
const paymentController = require('../controllers/payment.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

router.post('/vnpay/create-url', authenticate, paymentController.createVnpayUrl);
router.get('/vnpay/return', paymentController.vnpayReturn);

// Dev-only: simulate successful payment (disabled in production)
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-simulate/:bookingId', authenticate, paymentController.devSimulatePayment);
}

module.exports = router;
