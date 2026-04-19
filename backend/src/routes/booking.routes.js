const express = require('express');
const bookingController = require('../controllers/booking.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

// User routes
router.get('/my', authenticate, bookingController.getMyBookings);
router.post('/', authenticate, bookingController.createBooking);
router.patch('/my/:bookingId/cancel', authenticate, bookingController.cancelMyBooking);

// Staff routes
router.get('/staff/all', authenticate, authenticate.requireRole('staff', 'admin'), bookingController.getStaffBookings);
router.patch('/staff/:id/cancel', authenticate, authenticate.requireRole('staff', 'admin'), bookingController.staffCancelBooking);

// Admin routes
router.get('/', authenticate, authenticate.requireRole('admin'), bookingController.getAllBookings);
router.get('/:id', authenticate, authenticate.requireRole('admin', 'staff'), bookingController.getBookingById);
router.put('/:id', authenticate, authenticate.requireRole('admin', 'staff'), bookingController.updateBooking);
router.delete('/:id', authenticate, authenticate.requireRole('admin'), bookingController.deleteBooking);

module.exports = router;
