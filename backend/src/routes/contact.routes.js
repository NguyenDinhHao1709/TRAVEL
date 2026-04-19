const express = require('express');
const contactController = require('../controllers/contact.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

router.post('/', contactController.sendContactMessage);
router.get('/messages', authenticate, authenticate.requireRole('admin', 'staff'), contactController.getContactMessages);
router.patch('/messages/:id/read', authenticate, authenticate.requireRole('admin', 'staff'), contactController.markContactAsRead);

module.exports = router;
