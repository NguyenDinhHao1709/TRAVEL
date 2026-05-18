const pool = require('../config/db');

// Read lazily so nodemon env reload always picks up latest values
function getGeminiApiKey() { return process.env.GEMINI_API_KEY; }
function getGeminiModel() { return process.env.GEMINI_MODEL || 'gemini-2.5-flash'; }
const DEFAULT_SUGGESTIONS = [
  'Hệ thống HK2 Travel hỗ trợ gì?',
  'Cách đặt tour và thanh toán?',
  'Gợi ý tour Đà Nẵng còn chỗ'
];

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

function detectTourIntent(message) {
  const lower = message.toLowerCase();

  const travelKeywords = [
    'tour', 'du lịch', 'du lich', 'đi đâu', 'di dau', 'điểm đến', 'diem den',
    'lịch trình', 'lich trinh', 'giá', 'gia', 'bao nhiêu', 'con cho', 'còn chỗ',
    'destination', 'trip', 'travel', 'book tour', 'đặt tour', 'dat tour'
  ];

  const bookingKeywords = ['đặt tour', 'dat tour', 'booking', 'book tour', 'thanh toán', 'thanh toan', 'pay'];

  const hasTravelIntent = travelKeywords.some((keyword) => lower.includes(keyword));
  const hasBookingIntent = bookingKeywords.some((keyword) => lower.includes(keyword));

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

  return {
    hasTravelIntent: hasTravelIntent || Boolean(maxPrice) || Boolean(destFilter) || hasBookingIntent,
    hasBookingIntent,
    maxPrice,
    destFilter
  };
}

async function getRelevantTours(message) {
  const intent = detectTourIntent(message);
  if (!intent.hasTravelIntent) {
    return [];
  }

  let query = `SELECT id, title, destination, price, start_date, end_date, slots FROM tours WHERE slots > 0 AND start_date >= CURDATE()`;
  const params = [];

  if (intent.maxPrice) { query += ' AND price <= ?'; params.push(intent.maxPrice); }
  if (intent.destFilter) { query += ' AND LOWER(destination) LIKE ?'; params.push(`%${intent.destFilter}%`); }

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

async function getSystemSnapshot() {
  const [tourStatsRows] = await pool.execute(
    `SELECT 
      COUNT(*) AS totalTours,
      SUM(CASE WHEN start_date >= CURDATE() THEN 1 ELSE 0 END) AS upcomingTours,
      SUM(CASE WHEN start_date >= CURDATE() THEN slots ELSE 0 END) AS openSlots
    FROM tours`
  );
  const [articleRows] = await pool.execute('SELECT COUNT(*) AS totalArticles FROM articles');

  const tourStats = tourStatsRows[0] || {};
  const articleStats = articleRows[0] || {};

  return {
    totalTours: Number(tourStats.totalTours || 0),
    upcomingTours: Number(tourStats.upcomingTours || 0),
    openSlots: Number(tourStats.openSlots || 0),
    totalArticles: Number(articleStats.totalArticles || 0)
  };
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .map((item) => {
      const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : null;
      const text = String(item?.text || '').trim();
      if (!role || !text) return null;
      return { role, text };
    })
    .filter(Boolean)
    .slice(-8);
}

function buildSystemPrompt({ tours, systemSnapshot }) {
  const toursCtx = tours.length > 0
    ? `Các tour phù hợp hiện tại: ${tours.map((t) => `${t.title} - ${t.destination} - ${Number(t.price).toLocaleString('vi-VN')} VND - còn ${t.availableSlots} chỗ`).join('; ')}`
    : 'Không có danh sách tour phù hợp nào được truy xuất cho câu hỏi này; chỉ giới thiệu tour khi câu hỏi thực sự liên quan đến tour, lịch trình, giá hoặc đặt chỗ.';

  const systemCtx = [
    `Tổng quan dữ liệu hiện có: ${systemSnapshot.totalTours} tour, ${systemSnapshot.upcomingTours} tour sắp khởi hành, ${systemSnapshot.openSlots} chỗ còn trống, ${systemSnapshot.totalArticles} bài viết.`,
    'Tính năng website: xem danh sách tour, xem chi tiết tour, xem bài viết, đăng ký/đăng nhập, đặt tour, lịch sử đặt tour, wishlist, đánh giá, liên hệ, thanh toán online, chatbot AI.',
    'Phân quyền hệ thống: khách hàng dùng các chức năng mua tour; staff và admin có dashboard, quản lý tour, booking, bài viết, liên hệ và các nghiệp vụ vận hành.',
    'Quy trình khách hàng: đăng nhập, chọn tour, tạo booking, theo dõi lịch sử đặt tour, thanh toán trên website, sau chuyến đi có thể để lại đánh giá.',
    'Khi người dùng hỏi về hệ thống, hãy phân tích theo chức năng thực tế của HK2 Travel thay vì trả lời chung chung.'
  ].join(' ');

  return [
    'Bạn là trợ lý AI của hệ thống HK2 Travel.',
    'Luôn trả lời bằng tiếng Việt, tự nhiên, rõ ý, tập trung vào nhu cầu thực của người dùng.',
    'Nhiệm vụ của bạn là phân tích câu hỏi, xác định người dùng đang hỏi về tính năng hệ thống, quy trình sử dụng hay dữ liệu tour, rồi trả lời đúng trọng tâm.',
    'Nếu câu hỏi về hệ thống, hãy mô tả đúng các chức năng hiện có của HK2 Travel và chỉ ra luồng thao tác phù hợp trên website.',
    'Nếu câu hỏi về tour, hãy dựa vào dữ liệu tour được cung cấp; không bịa tour, giá, lịch trình hoặc chính sách.',
    'Chỉ nhắc đến tour cụ thể khi câu hỏi có liên quan đến tư vấn tour, điểm đến, giá, lịch trình hoặc đặt chỗ.',
    'Khi hướng dẫn thao tác, ưu tiên các bước ngắn gọn, thực tế, có thể làm ngay trong hệ thống.',
    'Không nói rằng bạn bị giới hạn vào câu trả lời mẫu hay dữ liệu cứng.',
    systemCtx,
    toursCtx
  ].join(' ');
}

async function askGemini(message, tours, history, systemSnapshot) {
  const GEMINI_API_KEY = getGeminiApiKey();
  const GEMINI_MODEL = getGeminiModel();
  if (!GEMINI_API_KEY) return null;

  const contents = normalizeHistory(history).map((item) => ({
    role: item.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: item.text }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const modelId = GEMINI_MODEL.startsWith('models/') ? GEMINI_MODEL.slice('models/'.length) : GEMINI_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`,

    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt({ tours, systemSnapshot }) }]
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 512
        }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const apiMessage = data?.error?.message || 'Gemini API request failed';
    throw new Error(apiMessage);
  }

  const reply = data?.candidates?.[0]?.content?.parts
    ?.map((part) => String(part?.text || '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!reply) {
    throw new Error('Gemini returned empty content');
  }

  return {
    reply,
    tours,
    suggestions: DEFAULT_SUGGESTIONS,
    source: 'gemini'
  };
}

function buildRuleBasedReply(message, tours) {
  const lower = message.toLowerCase();
  const suggestions = DEFAULT_SUGGESTIONS;

  if (lower.includes('hệ thống') || lower.includes('website') || lower.includes('tính năng') || lower.includes('chức năng')) {
    return {
      reply: 'HK2 Travel hỗ trợ xem tour, đăng ký/đăng nhập, đặt tour, theo dõi lịch sử đặt tour, thanh toán online, wishlist, đánh giá, liên hệ và chatbot hỗ trợ. Nếu bạn cần, mình có thể hướng dẫn chi tiết theo từng chức năng.',
      tours: [],
      suggestions
    };
  }

  if (lower.includes('đặt') || lower.includes('book')) {
    return {
      reply: 'Để đặt tour, bạn đăng nhập, mở chi tiết tour, chọn số lượng người, tạo booking rồi thanh toán trên website.',
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
  ask: async (message, history = []) => {
    const [tours, systemSnapshot] = await Promise.all([
      getRelevantTours(message),
      getSystemSnapshot()
    ]);

    if (getGeminiApiKey()) {
      try {
        return await askGemini(message, tours, history, systemSnapshot);
      } catch (e) {
        console.error('[AI] Gemini error:', e.message);
      }
    }

    if (openai) {
      try {
        const toursCtx = tours.length > 0
          ? `Các tour phù hợp: ${tours.map((t) => `${t.title} - ${t.destination} - ${Number(t.price).toLocaleString('vi-VN')} VND - còn ${t.availableSlots} chỗ`).join('; ')}`
          : 'Không có dữ liệu tour phù hợp nào cần dùng cho câu hỏi này.';
        const normalizedHistory = normalizeHistory(history);

        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Bạn là trợ lý AI của HK2 Travel. Trả lời ngắn gọn, thân thiện bằng tiếng Việt. Hãy phân tích câu hỏi để tư vấn đúng tính năng hệ thống hoặc dữ liệu tour. Tổng quan hệ thống: có ${systemSnapshot.totalTours} tour, ${systemSnapshot.upcomingTours} tour sắp khởi hành, ${systemSnapshot.totalArticles} bài viết; hỗ trợ đăng nhập, đặt tour, lịch sử đặt tour, thanh toán online, wishlist, đánh giá, liên hệ, dashboard staff/admin. ${toursCtx}`
            },
            ...normalizedHistory.map((item) => ({ role: item.role, content: item.text })),
            { role: 'user', content: message }
          ],
          max_tokens: 300
        });

        return {
          reply: response.choices[0].message.content,
          tours,
          suggestions: DEFAULT_SUGGESTIONS,
          source: 'openai'
        };
      } catch (e) {
        console.error('[AI] OpenAI error:', e.message);
      }
    }

    return { ...buildRuleBasedReply(message, tours), source: 'rules' };
  }
};
