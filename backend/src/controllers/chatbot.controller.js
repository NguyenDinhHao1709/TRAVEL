const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { generateAIReply } = require('../services/ai-assistant.service');

const formatMoney = (value) => Number(value || 0).toLocaleString('vi-VN');

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/đ/g, 'd')
  .replace(/\s+/g, ' ')
  .trim();

const toVndValue = (raw, unit) => {
  const parsed = Number(String(raw || '0').replace(',', '.'));
  if (Number.isNaN(parsed)) return 0;
  const normalizedUnit = String(unit || '').toLowerCase();
  if (normalizedUnit.startsWith('tr') || normalizedUnit === 'm') {
    return Math.round(parsed * 1000000);
  }
  return Math.round(parsed);
};

const extractBudget = (normalized) => {
  const rangeMatch = normalized.match(/tu\s*(\d+(?:[.,]\d+)?)\s*(tr|trieu|m|vnd)?\s*den\s*(\d+(?:[.,]\d+)?)\s*(tr|trieu|m|vnd)?/);
  if (rangeMatch) {
    return {
      min: toVndValue(rangeMatch[1], rangeMatch[2]),
      max: toVndValue(rangeMatch[3], rangeMatch[4] || rangeMatch[2])
    };
  }

  const underMatch = normalized.match(/(duoi|toi da|max|khong qua)\s*(\d+(?:[.,]\d+)?)\s*(tr|trieu|m|vnd)?/);
  if (underMatch) {
    return { min: 0, max: toVndValue(underMatch[2], underMatch[3]) };
  }

  const overMatch = normalized.match(/(tren|tu|it nhat|min)\s*(\d+(?:[.,]\d+)?)\s*(tr|trieu|m|vnd)?/);
  if (overMatch) {
    return { min: toVndValue(overMatch[2], overMatch[3]), max: Infinity };
  }

  return null;
};

const detectIntent = (normalized) => {
  if (/(bao nhieu tour|co bao nhieu tour|so luong tour|tong tour)/.test(normalized)) return 'statistics';
  if (/(thanh toan|booking|dat tour|huong dan dat)/.test(normalized)) return 'guide';
  if (/(con cho|slot|het cho|cho trong)/.test(normalized)) return 'availability';
  if (/(gia|bao nhieu tien|chi phi|budget|re nhat|gia re|dat nhat|mac nhat|cao nhat|thap nhat)/.test(normalized)) return 'price';
  if (/(goi y|de xuat|nen di|recommend|tu van)/.test(normalized)) return 'recommend';
  if (/(lich trinh|diem den|di dau|o dau|tour nao)/.test(normalized)) return 'destination';
  return 'general';
};

const detectPriceMode = (normalized) => {
  if (/(dat nhat|mac nhat|cao nhat|gia cao nhat)/.test(normalized)) return 'highest';
  if (/(re nhat|thap nhat|gia thap nhat|gia re|tiet kiem)/.test(normalized)) return 'lowest';
  return null;
};

const extractPeopleCount = (normalized) => {
  const directMatch = normalized.match(/(\d+)\s*(nguoi|khach|suat)/);
  if (directMatch) return Number(directMatch[1]);

  const forMatch = normalized.match(/cho\s*(\d+)/);
  if (forMatch) return Number(forMatch[1]);

  return null;
};

const mapTour = (tour) => ({
  id: tour.id,
  title: tour.title,
  destination: tour.destination,
  itinerary: tour.itinerary,
  price: Number(tour.price || 0),
  startDate: tour.start_date,
  endDate: tour.end_date,
  availableSlots: Math.max(Number(tour.slots || 0) - Number(tour.booked_people || 0), 0)
});

const dedupeTours = (tours = []) => {
  const seen = new Set();
  const unique = [];

  for (const tour of tours) {
    const key = [
      normalizeText(tour.title),
      normalizeText(tour.destination),
      Number(tour.price || 0),
      String(tour.startDate || ''),
      String(tour.endDate || '')
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(tour);
  }

  return unique;
};

const describeTour = (tour) =>
  `- ${tour.title} (${tour.destination}) | ${formatMoney(tour.price)} VND | Còn ${tour.availableSlots} chỗ | ${formatDate(tour.startDate)} - ${formatDate(tour.endDate)}`;

const detectTheme = (normalized) => {
  if (/(bien|dao|phu quoc|nha trang|da nang)/.test(normalized)) return 'beach';
  if (/(nui|cao nguyen|da lat|sapa|trek)/.test(normalized)) return 'mountain';
  if (/(gia dinh|tre em|nguoi lon tuoi)/.test(normalized)) return 'family';
  if (/(cap doi|honeymoon|lang man)/.test(normalized)) return 'romantic';
  return null;
};

const buildContextProfile = ({ message, history, tours }) => {
  const destinationList = [...new Set(tours.map((tour) => normalizeText(tour.destination)).filter(Boolean))]
    .sort((a, b) => b.length - a.length);
  const allTexts = [...history.filter((item) => item.role === 'user').map((item) => item.message), message]
    .map(normalizeText)
    .filter(Boolean)
    .reverse();

  let budget = null;
  let destination = null;
  let theme = null;
  let peopleCount = null;

  for (const text of allTexts) {
    if (!budget) budget = extractBudget(text);
    if (!destination) destination = destinationList.find((name) => name.length >= 2 && text.includes(name)) || null;
    if (!theme) theme = detectTheme(text);
    if (!peopleCount) peopleCount = extractPeopleCount(text);
    if (budget && destination && theme && peopleCount) break;
  }

  return { budget, destination, theme, peopleCount };
};

const matchTheme = (tour, theme) => {
  if (!theme) return true;
  const normalized = normalizeText(`${tour.title} ${tour.destination} ${tour.itinerary || ''}`);

  if (theme === 'beach') return /(bien|dao|phu quoc|nha trang|da nang)/.test(normalized);
  if (theme === 'mountain') return /(nui|cao nguyen|da lat|sapa|trek)/.test(normalized);
  if (theme === 'family') return /(gia dinh|tre em|nghi duong|resort|an toan)/.test(normalized);
  if (theme === 'romantic') return /(lang man|honeymoon|cap doi|hoang hon)/.test(normalized);
  return true;
};

const contextSummaryText = (contextProfile) => {
  const summary = [];
  if (contextProfile?.destination) summary.push(`điểm đến ưu tiên: ${contextProfile.destination}`);
  if (contextProfile?.budget) {
    summary.push(
      `ngân sách: từ ${formatMoney(contextProfile.budget.min)} đến ${Number.isFinite(contextProfile.budget.max) ? formatMoney(contextProfile.budget.max) : 'không giới hạn'} VND`
    );
  }
  if (contextProfile?.theme) summary.push(`chủ đề: ${contextProfile.theme}`);
  if (contextProfile?.peopleCount) summary.push(`số người dự kiến: ${contextProfile.peopleCount}`);
  return summary.length ? `Ngữ cảnh người dùng đang quan tâm: ${summary.join(' | ')}` : '';
};

const parseOptionalUser = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

const loadTourFacts = async () => {
  const [rows] = await pool.query(
    `SELECT t.id, t.title, t.destination, t.itinerary, t.price, t.start_date, t.end_date, t.slots,
            COALESCE(SUM(CASE WHEN b.booking_status <> 'cancelled' THEN b.people_count ELSE 0 END), 0) AS booked_people
     FROM tours t
     LEFT JOIN bookings b ON b.tour_id = t.id
     GROUP BY t.id
     ORDER BY t.created_at DESC`
  );

  return dedupeTours(rows.map(mapTour));
};

const loadArticleFacts = async () => {
  const [rows] = await pool.query(
    `SELECT a.id, a.title, a.content, a.created_at, t.title AS tour_title
     FROM articles a
     LEFT JOIN tours t ON t.id = a.tour_id
     ORDER BY a.created_at DESC
     LIMIT 20`
  );
  return rows;
};

const loadUserHistory = async (userId, limit = 20) => {
  const [rows] = await pool.query(
    `SELECT role, message, created_at
     FROM chatbot_histories
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, Number(limit)]
  );

  return rows.reverse();
};

const saveHistoryMessage = async (userId, role, message) => {
  await pool.query(
    'INSERT INTO chatbot_histories (user_id, role, message) VALUES (?, ?, ?)',
    [userId, role, message]
  );
};

const buildFallbackReply = ({ message, tours, contextProfile }) => {
  const normalized = normalizeText(message);
  const intent = detectIntent(normalized);
  const priceMode = detectPriceMode(normalized);
  const budget = extractBudget(normalized);
  const peopleCount = extractPeopleCount(normalized) || null;
  const allDestinations = [...new Set(tours.map((tour) => normalizeText(tour.destination)).filter(Boolean))]
    .sort((a, b) => b.length - a.length); // longest first → prevents "da" matching before "da lat"
  const matchedDestination = allDestinations.find((destination) => destination.length >= 2 && normalized.includes(destination)) || null;
  const currentTheme = detectTheme(normalized);

  let candidateTours = [...tours];
  if (budget) {
    candidateTours = candidateTours.filter((tour) =>
      tour.price >= budget.min && tour.price <= (Number.isFinite(budget.max) ? budget.max : Number.MAX_SAFE_INTEGER)
    );
  }

  if (currentTheme) {
    candidateTours = candidateTours.filter((tour) => matchTheme(tour, currentTheme));
  }

  if (peopleCount && Number.isFinite(peopleCount)) {
    candidateTours = candidateTours.filter((tour) => tour.availableSlots >= peopleCount);
  }

  const withDestinationPriority = (list, compareFn) => {
    if (!matchedDestination) return [...list].sort(compareFn);

    return [...list].sort((a, b) => {
      const aDestination = normalizeText(a.destination);
      const bDestination = normalizeText(b.destination);
      const aMatch = aDestination === matchedDestination ? 1 : 0;
      const bMatch = bDestination === matchedDestination ? 1 : 0;

      if (aMatch !== bMatch) return bMatch - aMatch;
      return compareFn(a, b);
    });
  };

  const sortedByPrice = withDestinationPriority(candidateTours, (a, b) => a.price - b.price);
  const sortedByPriceDesc = withDestinationPriority(candidateTours, (a, b) => b.price - a.price);
  const sortedByAvailable = withDestinationPriority(candidateTours, (a, b) => b.availableSlots - a.availableSlots);

  const pickRelevantTours = (sortedList, limit = 5) => {
    if (!matchedDestination) return sortedList.slice(0, limit);

    const exactDestination = sortedList.filter((tour) => normalizeText(tour.destination) === matchedDestination);
    const themeRelated = sortedList.filter((tour) =>
      normalizeText(tour.destination) !== matchedDestination && currentTheme && matchTheme(tour, currentTheme)
    );
    const others = sortedList.filter((tour) =>
      normalizeText(tour.destination) !== matchedDestination && (!currentTheme || !matchTheme(tour, currentTheme))
    );

    const merged = [...exactDestination, ...themeRelated, ...others];
    const deduped = [];
    const seen = new Set();

    for (const tour of merged) {
      if (seen.has(tour.id)) continue;
      seen.add(tour.id);
      deduped.push(tour);
      if (deduped.length >= limit) break;
    }

    return deduped;
  };

  let reply = '';
  let resultTours = [];
  let suggestions = ['Gợi ý tour dưới 4 triệu', 'Tour nào còn chỗ nhiều?', 'Tư vấn tour Đà Nẵng'];

  if (intent === 'statistics') {
    const byDestination = candidateTours.reduce((acc, tour) => {
      acc[tour.destination] = (acc[tour.destination] || 0) + 1;
      return acc;
    }, {});

    const topDestinations = Object.entries(byDestination)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([destination, count]) => `${destination}: ${count} tour`)
      .join(' | ');

    reply = `Hiện có ${candidateTours.length} tour phù hợp với yêu cầu của bạn.${topDestinations ? `\nPhân bố điểm đến: ${topDestinations}` : ''}`;
    resultTours = pickRelevantTours(sortedByPrice, 4);
    suggestions = ['Tour rẻ nhất hiện tại', 'Tour mắc nhất hiện tại', 'Tour còn nhiều chỗ nhất'];
  } else if (intent === 'price') {
    if (priceMode === 'highest') {
      resultTours = pickRelevantTours(sortedByPriceDesc, 5);
      reply = resultTours.length
        ? `Đây là các tour có giá cao nhất hiện tại:\n${resultTours.map(describeTour).join('\n')}`
        : 'Hiện chưa có dữ liệu tour để so sánh giá.';
      suggestions = ['Tour rẻ nhất hiện tại', 'Tour dưới 5 triệu', 'Tour nào còn chỗ nhiều?'];
    } else {
      resultTours = pickRelevantTours(sortedByPrice, 5);
      reply = resultTours.length
        ? `Mình đã lọc theo mức giá phù hợp cho bạn:\n${resultTours.map(describeTour).join('\n')}`
        : 'Hiện chưa có tour phù hợp mức giá bạn đưa ra. Bạn thử nới ngân sách thêm một chút nhé.';
      suggestions = ['Tour dưới 5 triệu', 'Tour 3 đến 6 triệu', 'Tour mắc nhất hiện tại'];
    }
  } else if (intent === 'availability') {
    resultTours = pickRelevantTours(sortedByAvailable.filter((tour) => tour.availableSlots > 0), 5);
    reply = resultTours.length
      ? `Đây là các tour còn nhiều chỗ trống nhất hiện tại:\n${resultTours.map(describeTour).join('\n')}`
      : 'Hiện các tour đang gần kín chỗ. Bạn thử lại sau hoặc chọn ngày khởi hành khác nhé.';
    suggestions = ['Tour còn chỗ ở Phú Quốc', 'Tour sắp khởi hành còn chỗ', 'Tour cho 2 người'];
  } else if (intent === 'destination' || intent === 'recommend') {
    resultTours = pickRelevantTours(sortedByPrice, 5);
    reply = resultTours.length
      ? `Mình gợi ý các tour phù hợp dựa trên yêu cầu hiện tại:\n${resultTours.map(describeTour).join('\n')}`
      : 'Mình chưa tìm thấy tour khớp hoàn toàn theo ngữ cảnh hiện tại. Bạn có thể nói rõ thêm điểm đến hoặc ngân sách mong muốn.';
    suggestions = ['Tour Đà Lạt', 'Tour biển giá tốt', 'Tour gia đình'];
  } else if (intent === 'guide') {
    reply =
      'Quy trình đặt tour nhanh:\n'
      + '- B1: Chọn tour và ngày khởi hành phù hợp\n'
      + '- B2: Nhập số lượng người, kiểm tra tổng tiền\n'
      + '- B3: Xác nhận đặt và thanh toán (VNPay/MoMo/khác)\n'
      + '- B4: Theo dõi trạng thái đơn trong mục Đơn đặt của tôi\n'
      + 'Nếu bạn muốn, mình có thể gợi ý ngay 3 tour phù hợp ngân sách của bạn.';
    resultTours = pickRelevantTours(sortedByPrice, 3);
    suggestions = ['Gợi ý 3 tour rẻ nhất', 'Hướng dẫn thanh toán VNPay', 'Tour phù hợp ngân sách 5 triệu'];
  } else {
    resultTours = pickRelevantTours(sortedByPrice, 4);
    reply = resultTours.length
      ? `Mình có thể tư vấn theo giá, điểm đến, số chỗ còn lại và lịch trình. Một số tour nổi bật hiện tại:\n${resultTours.map(describeTour).join('\n')}`
      : 'Hiện chưa có dữ liệu tour để tư vấn. Bạn thử lại sau nhé.';
  }

  if (peopleCount && resultTours.length) {
    reply += `\n(Đã lọc theo nhóm ${peopleCount} người)`;
  }

  return { reply, tours: resultTours, suggestions };
};

const askChatbot = async (req, res) => {
  try {
    const { message = '' } = req.body;
    const cleanedMessage = String(message || '').trim();

    if (!cleanedMessage) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung cần tư vấn' });
    }

    const [tours, articles] = await Promise.all([loadTourFacts(), loadArticleFacts()]);

    const history = [];

    const contextProfile = buildContextProfile({ message: cleanedMessage, history, tours });
    const fallback = buildFallbackReply({ message: cleanedMessage, tours, contextProfile });

    let aiReply = null;
    try {
      aiReply = await generateAIReply({
        message: cleanedMessage,
        tours: tours.map((tour) => ({
          title: tour.title,
          destination: tour.destination,
          price: tour.price,
          start_date: tour.startDate,
          end_date: tour.endDate,
          available_slots: tour.availableSlots
        })),
        articles,
        conversation: [],
        contextSummary: ''
      });
    } catch (aiError) {
      console.error('AI reply failed, using fallback:', aiError.message);
    }

    const finalReply = aiReply || fallback.reply;

    return res.json({
      reply: finalReply,
      tours: fallback.tours,
      suggestions: fallback.suggestions,
      source: aiReply ? 'openai' : 'fallback'
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getChatbotHistory = async (req, res) => {
  try {
    const rows = await loadUserHistory(req.user.id, 80);
    return res.json({ items: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const clearChatbotHistory = async (req, res) => {
  try {
    await pool.query('DELETE FROM chatbot_histories WHERE user_id = ?', [req.user.id]);
    return res.json({ message: 'Đã xóa lịch sử trò chuyện trợ lý AI' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  askChatbot,
  getChatbotHistory,
  clearChatbotHistory
};
