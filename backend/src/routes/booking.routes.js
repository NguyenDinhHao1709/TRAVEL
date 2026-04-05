const express = require('express');
const {
  createBooking,
  getMyBookings,
  cancelMyBooking,
  getAllBookingsForStaff,
  cancelBookingByStaff
} = require('../controllers/booking.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, authorize('user'), createBooking);
router.get('/my', authenticate, authorize('user'), getMyBookings);
router.patch('/my/:id/cancel', authenticate, authorize('user'), cancelMyBooking);
router.get('/staff/all', authenticate, authorize('staff', 'admin'), getAllBookingsForStaff);
router.patch('/staff/:id/cancel', authenticate, authorize('staff', 'admin'), cancelBookingByStaff);

module.exports = router;
