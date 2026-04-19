const pool = require('../config/db');

// Khởi tạo OpenAI nếu có API key
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    const { OpenAI } = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch {
    console.warn('[AI] openai package chưa cài. Dùng rule-based fallback.');
  }
}

async function getRelevantTours(message) {
  const lower = message.toLowerCase();

  // Trích xuất giá
  const priceMatch = lower.match(/(\d+)\s*(triệu|trieu|million)/i);
  const maxPrice = priceMatch ? Number(priceMatch[1]) * 1_000_000 : null;

  // Trích xuất điểm đến
  const knownDests = [
    'đà nẵng', 'da nang', 'phú quốc', 'phu quoc',
    'hội an', 'hoi an', 'hà nội', 'ha noi',
    'hồ chí minh', 'sai gon', 'nha trang', 'đà lạt', 'da lat',
    'hạ long', 'ha long', 'huế', 'hue', 'cần thơ', 'can tho'
  ];
  let destFilter = null;
  for (const dest of knownDests) {
    if (lower.includes(dest)) { destFilter = dest; break; }
  }

  let query = `SELECT id, title, destination, price, start_date, end_date, slots FROM tours WHERE slots > 0 AND start_date >= CURDATE()`;
  const params = [];

  if (maxPrice) { query += ' AND price <= ?'; params.push(maxPrice); }
  if (destFilter) { query += ' AND LOWER(destination) LIKE ?'; params.push(`%${destFilter}%`); }

  query += ' ORDER BY slots DESC LIMIT 5';
  const [rows] = await pool.execute(query, params);

  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    destination: t.destination,
    price: t.price,
    startDate: t.start_date,
    endDate: t.end_date,
    availableSlots: t.slots
  }));
}

function buildRuleBasedReply(message, tours) {
  const lower = message.toLowerCase();
  const suggestions = ['Gợi ý tour dưới 4 triệu', 'Tour nào còn chỗ nhiều?', 'Tư vấn tour Đà Nẵng'];

  if (lower.includes('đặt') || lower.includes('book')) {
    return {
      reply: 'Bạn muốn đặt tour? Vui lòng đăng nhập và chọn tour trên trang danh sách tour.',
      tours: [],
      suggestions
    };
  }

  if (tours.length === 0) {
    return {
      reply: 'Xin lỗi, mình chưa tìm thấy tour phù hợp. Bạn có thể thử tìm kiếm với từ khóa khác.',
      tours: [],
      suggestions
    };
  }

  let reply = `Mình tìm được ${tours.length} tour phù hợp:`;
  for (const t of tours) {
    reply += `\n- ${t.title} (${t.destination}): ${Number(t.price).toLocaleString('vi-VN')} VND, còn ${t.availableSlots} chỗ`;
  }

  return { reply, tours, suggestions };
}

module.exports = {
  ask: async (message) => {
    const tours = await getRelevantTours(message);

    if (openai) {
      try {
        const toursCtx = tours.length > 0
          ? `Các tour phù hợp: ${tours.map((t) => `${t.title} - ${t.destination} - ${Number(t.price).toLocaleString('vi-VN')} VND - còn ${t.availableSlots} chỗ`).join('; ')}`
          : 'Không có tour phù hợp hiện tại.';

        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Bạn là trợ lý du lịch của HK2 Travel. Trả lời ngắn gọn, thân thiện bằng tiếng Việt. Không liệt kê tour bằng gạch đầu dòng vì hệ thống sẽ hiển thị tour tự động. ${toursCtx}`
            },
            { role: 'user', content: message }
          ],
          max_tokens: 300
        });

        return {
          reply: response.choices[0].message.content,
          tours,
          suggestions: ['Gợi ý tour dưới 4 triệu', 'Tour nào còn chỗ nhiều?', 'Tư vấn tour Đà Nẵng'],
          source: 'openai'
        };
      } catch (e) {
        console.error('[AI] OpenAI error:', e.message);
      }
    }

    return { ...buildRuleBasedReply(message, tours), source: 'rules' };
  }
};
