const express = require('express');
const { createVNPayPaymentUrl, handleVNPayReturn } = require('../controllers/vnpay.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/vnpay/create-url', authenticate, authorize('user'), createVNPayPaymentUrl);
router.get('/vnpay/return', handleVNPayReturn);

module.exports = router;
