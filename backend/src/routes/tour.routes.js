const express = require('express');
const { getTours, getFeaturedTours, getTourById, createTour, updateTour, deleteTour } = require('../controllers/tour.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getTours);
router.get('/featured', getFeaturedTours);
router.get('/:id', getTourById);
router.post('/', authenticate, authorize('admin'), createTour);
router.put('/:id', authenticate, authorize('admin'), updateTour);
router.delete('/:id', authenticate, authorize('admin'), deleteTour);

module.exports = router;
