const express = require('express');
const chatController = require('../controllers/chat.controller');
const authenticate = require('../middleware/auth');
const router = express.Router();

// User: get or create their chat room
router.get('/room', authenticate, chatController.getOrCreateRoom);

// Staff/Admin: get all rooms
router.get('/rooms', authenticate, authenticate.requireRole('staff', 'admin'), chatController.getAllRooms);

// Get messages for a room
router.get('/rooms/:roomId/messages', authenticate, chatController.getRoomMessages);

// Send message to a room
router.post('/rooms/:roomId/messages', authenticate, chatController.sendMessage);

// Staff/Admin: close room
router.patch('/rooms/:roomId/close', authenticate, authenticate.requireRole('staff', 'admin'), chatController.closeRoom);

module.exports = router;
