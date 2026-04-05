const express = require('express');
const { createMoMoPaymentUrl, handleMoMoReturn, handleMoMoIpn } = require('../controllers/momo.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/momo/create-url', authenticate, authorize('user'), createMoMoPaymentUrl);
router.get('/momo/return', handleMoMoReturn);
router.post('/momo/ipn', handleMoMoIpn);

module.exports = router;
