const aiService = require('../services/ai-assistant.service');

exports.askBot = async (req, res) => {
  const { message, history } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập câu hỏi' });
  }

  try {
    const result = await aiService.ask(String(message).trim(), history);

    if (typeof result === 'string') {
      return res.json({ reply: result, tours: [], suggestions: [] });
    }

    return res.json({
      reply: result.reply || '',
      tours: result.tours || [],
      suggestions: result.suggestions || [],
      source: result.source || 'rules'
    });
  } catch (err) {
    console.error('[Chatbot] Unhandled error:', err.message);
    return res.json({
      reply: 'Xin lỗi, mình chưa tìm được câu trả lời phù hợp. Bạn thử đặt câu hỏi khác nhé!',
      tours: [],
      suggestions: ['Gợi ý tour Đà Nẵng còn chỗ', 'Cách đặt tour và thanh toán?'],
      source: 'fallback'
    });
  }
};
