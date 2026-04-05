const express = require('express');
const { payForBooking } = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, authorize('user'), payForBooking);

module.exports = router;
