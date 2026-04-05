const express = require('express');
const { getCustomers, getCustomerBookingHistory } = require('../controllers/staff.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/customers', authenticate, authorize('staff', 'admin'), getCustomers);
router.get('/customers/:customerId/bookings', authenticate, authorize('staff', 'admin'), getCustomerBookingHistory);

module.exports = router;
