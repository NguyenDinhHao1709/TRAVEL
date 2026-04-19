const express = require('express');
const wishlistController = require('../controllers/wishlist.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

// User routes
router.get('/my', authenticate, wishlistController.getMyWishlist);
router.delete('/my/:tourId', authenticate, wishlistController.removeFromWishlistByTourId);
router.post('/', authenticate, wishlistController.addToWishlist);

// Admin routes
router.get('/', authenticate, authenticate.requireRole('admin'), wishlistController.getAllWishlists);
router.delete('/:id', authenticate, authenticate.requireRole('admin'), wishlistController.removeFromWishlist);

module.exports = router;
