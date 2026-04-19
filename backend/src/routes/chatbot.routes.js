const express = require('express');
const chatbotController = require('../controllers/chatbot.controller');
const router = express.Router();

router.post('/ask', chatbotController.askBot);

module.exports = router;
