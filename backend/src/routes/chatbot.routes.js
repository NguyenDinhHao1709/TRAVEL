const express = require('express');
const { askChatbot, getChatbotHistory, clearChatbotHistory } = require('../controllers/chatbot.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/ask', askChatbot);
router.get('/history', authenticate, getChatbotHistory);
router.delete('/history', authenticate, clearChatbotHistory);

module.exports = router;
