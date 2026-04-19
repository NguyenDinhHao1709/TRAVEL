const express = require('express');
const tourController = require('../controllers/tour.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

router.get('/featured', tourController.getFeaturedTours);
router.get('/', tourController.getAllTours);
router.get('/:id', tourController.getTourById);
router.post('/', authenticate, authenticate.requireRole('admin'), tourController.createTour);
router.put('/:id', authenticate, authenticate.requireRole('admin'), tourController.updateTour);
router.delete('/:id', authenticate, authenticate.requireRole('admin'), tourController.deleteTour);

module.exports = router;
