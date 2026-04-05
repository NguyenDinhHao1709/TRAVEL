const buildFactsPrompt = ({ tours = [], articles = [] }) => {
  const tourFacts = tours.slice(0, 12).map((tour, index) => (
    `${index + 1}. ${tour.title} | Điểm đến: ${tour.destination} | Giá: ${Number(tour.price || 0).toLocaleString('vi-VN')} VND | `
    + `Lịch: ${tour.start_date || 'N/A'} -> ${tour.end_date || 'N/A'} | Còn chỗ: ${tour.available_slots}`
  )).join('\n');

  const articleFacts = articles.slice(0, 8).map((article, index) => (
    `${index + 1}. ${article.title} | Nội dung: ${String(article.content || '').slice(0, 280)}`
  )).join('\n');

  return `Dữ liệu tour hiện có:\n${tourFacts || '- Không có dữ liệu'}\n\nDữ liệu bài viết:\n${articleFacts || '- Không có dữ liệu'}`;
};

const generateAIReply = async ({ message, tours, articles, conversation = [], contextSummary = '' }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const factsPrompt = buildFactsPrompt({ tours, articles });

  const systemPrompt =
    'Bạn là trợ lý tư vấn du lịch HK2 Travel. Trả lời bằng tiếng Việt, rõ ràng, đầy đủ, chính xác theo dữ liệu được cung cấp. '
    + 'Không bịa thông tin. Nếu chưa đủ dữ liệu thì nêu rõ và gợi ý câu hỏi tiếp theo. '
    + 'Khi tư vấn tour, ưu tiên nêu: điểm đến, giá, thời gian, chỗ còn lại, đối tượng phù hợp. '
    + 'Trả lời ngắn gọn theo dạng gạch đầu dòng khi phù hợp.';

  const historyMessages = conversation.slice(-8).map((item) => ({
    role: item.role === 'assistant' ? 'assistant' : 'user',
    content: item.message
  }));

  const payload = {
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: factsPrompt },
      ...(contextSummary ? [{ role: 'system', content: contextSummary }] : []),
      ...historyMessages,
      { role: 'user', content: message }
    ]
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return String(content || '').trim() || null;
};

module.exports = {
  generateAIReply
};
