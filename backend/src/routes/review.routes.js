const express = require('express');
const {
	createReview,
	getReviewsByTour,
	getAllReviewsForAdmin,
	getAllReviewsForStaff,
	updateReviewStatus,
	replyToReview
} = require('../controllers/review.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, authorize('user'), createReview);
router.get('/tour/:tourId', getReviewsByTour);
router.get('/admin/all', authenticate, authorize('admin'), getAllReviewsForAdmin);
router.get('/staff/all', authenticate, authorize('staff', 'admin'), getAllReviewsForStaff);
router.patch('/admin/:id/status', authenticate, authorize('admin'), updateReviewStatus);
router.patch('/staff/:id/reply', authenticate, authorize('staff', 'admin'), replyToReview);

module.exports = router;
