const aiService = require('../services/ai-assistant.service');

exports.askBot = async (req, res) => {
  const { message } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập câu hỏi' });
  }

  const result = await aiService.ask(String(message).trim());

  if (typeof result === 'string') {
    return res.json({ reply: result, tours: [], suggestions: [] });
  }

  res.json({
    reply: result.reply || '',
    tours: result.tours || [],
    suggestions: result.suggestions || [],
    source: result.source || 'rules'
  });
};
