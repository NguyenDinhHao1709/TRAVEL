const express = require('express');
const reviewController = require('../controllers/review.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

// Admin & Staff
router.get('/admin/all', authenticate, authenticate.requireRole('admin', 'staff'), reviewController.getAdminAllReviews);
// Staff
router.get('/staff/all', authenticate, authenticate.requireRole('staff', 'admin'), reviewController.getStaffAllReviews);
router.patch('/staff/:id/reply', authenticate, authenticate.requireRole('staff', 'admin'), reviewController.staffReplyReview);

// User - reply to staff
router.patch('/:id/customer-reply', authenticate, reviewController.customerReplyReview);

// User - my review
router.get('/my/:tourId', authenticate, reviewController.getMyReview);
router.delete('/:id/my', authenticate, reviewController.deleteOwnReview);

// Public
router.get('/', reviewController.getAllReviews);
router.get('/:id', reviewController.getReviewById);

// User
router.post('/', authenticate, reviewController.createReview);
// Admin & Staff
router.put('/:id', authenticate, authenticate.requireRole('admin', 'staff'), reviewController.updateReview);
router.delete('/:id', authenticate, authenticate.requireRole('admin', 'staff'), reviewController.deleteReview);

module.exports = router;
