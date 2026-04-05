const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const chatController = require('../controllers/chat.controller');

router.get('/room', authenticate, authorize('user'), chatController.getOrCreateRoom);

router.get('/rooms/:roomId/messages', authenticate, chatController.getMessages);

router.post('/rooms/:roomId/messages', authenticate, chatController.sendMessage);

router.get('/rooms', authenticate, authorize('staff', 'admin'), chatController.getAllRooms);

router.patch('/rooms/:roomId/close', authenticate, authorize('staff', 'admin'), chatController.closeRoom);

module.exports = router;
