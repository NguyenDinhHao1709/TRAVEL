const express = require('express');
const {
  createContactMessage,
  getContactMessages,
  markContactMessageAsRead
} = require('../controllers/contact.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', createContactMessage);
router.get('/messages', authenticate, authorize('staff', 'admin'), getContactMessages);
router.patch('/messages/:id/read', authenticate, authorize('staff', 'admin'), markContactMessageAsRead);

module.exports = router;