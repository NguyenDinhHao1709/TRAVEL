const express = require('express');
const { addToWishlist, getMyWishlist, removeFromWishlist } = require('../controllers/wishlist.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, authorize('user'), addToWishlist);
router.get('/my', authenticate, authorize('user'), getMyWishlist);
router.delete('/my/:tourId', authenticate, authorize('user'), removeFromWishlist);

module.exports = router;
