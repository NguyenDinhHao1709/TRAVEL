const pool = require('../config/db');

// Read lazily so nodemon env reload always picks up latest values
function getGeminiApiKey() { return process.env.GEMINI_API_KEY; }
function getGeminiModel() { return process.env.GEMINI_MODEL || 'gemini-2.5-flash'; }
function getGeminiModelCandidates() {
  return [...new Set([
    getGeminiModel(),
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-flash-latest'
  ])];
}
const DEFAULT_SUGGESTIONS = [
  'Tour nào giá rẻ nhất?',
  'Hướng dẫn đặt tour',
  'Gợi ý tour cho gia đình'
];

function getDynamicSuggestions(questionType) {
  const map = {
    cheapest:         ['Tour còn nhiều chỗ nhất?', 'Tour sắp khởi hành gần nhất?', 'Hướng dẫn đặt tour'],
    most_expensive:   ['Tour nào giá rẻ nhất?', 'Tour biển đảo có gì?', 'Cách đặt tour và thanh toán?'],
    most_available:   ['Tour nào giá rẻ nhất?', 'Tour sắp khởi hành gần nhất?', 'Gợi ý tour cho gia đình'],
    upcoming:         ['Tour nào giá rẻ nhất?', 'Hướng dẫn đặt tour', 'Chính sách hủy tour?'],
    recommend:        ['Tour biển đảo có gì?', 'Tour miền Bắc hay miền Nam?', 'Hướng dẫn đặt tour'],
    cancel_policy:    ['Chính sách hoàn tiền?', 'Hướng dẫn đặt tour', 'Liên hệ hỗ trợ'],
    refund_policy:    ['Chính sách hủy tour?', 'Hướng dẫn đặt tour', 'Liên hệ hỗ trợ'],
    payment_info:     ['Hướng dẫn đặt tour', 'Chính sách hủy tour?', 'Tour nào giá rẻ nhất?'],
    contact_info:     ['Hướng dẫn đặt tour', 'Chính sách hủy tour?', 'Danh sách tất cả tour'],
    group_tour:       ['Tour nào còn nhiều chỗ?', 'Hướng dẫn đặt tour', 'Liên hệ hỗ trợ'],
    children_tour:    ['Tour biển đảo có gì?', 'Tour ngắn ngày phù hợp?', 'Hướng dẫn đặt tour'],
    senior_tour:      ['Tour tâm linh có gì?', 'Tour biển nghỉ dưỡng?', 'Liên hệ hỗ trợ'],
    wishlist_help:    ['Hướng dẫn đặt tour', 'Tour nào hay gợi ý?', 'Danh sách tất cả tour'],
    review_help:      ['Hướng dẫn đặt tour', 'Tour nào giá rẻ nhất?', 'Liên hệ hỗ trợ'],
    account_register: ['Hướng dẫn đặt tour', 'Cách thanh toán online', 'Danh sách tất cả tour'],
    account_password: ['Liên hệ hỗ trợ', 'Hướng dẫn đặt tour', 'Danh sách tất cả tour'],
    booking_history:  ['Chính sách hủy tour?', 'Hướng dẫn đặt tour', 'Liên hệ hỗ trợ'],
    insurance_info:   ['Chính sách hủy tour?', 'Hướng dẫn đặt tour', 'Liên hệ hỗ trợ'],
  };
  return map[questionType] || DEFAULT_SUGGESTIONS;
}
const PROJECT_CAPABILITIES = [
  'HK2 Travel là hệ thống đặt tour du lịch trực tuyến dành cho khách hàng.',
  'Khách hàng có thể: xem danh sách tour, xem chi tiết tour (lịch trình, giá, điểm đến), tìm kiếm tour theo điểm đến hoặc ngân sách, đọc bài viết du lịch, đăng ký tài khoản, đăng nhập, đặt tour, thanh toán online qua cổng PayOS, xem lịch sử đặt tour, thêm tour vào danh sách yêu thích (wishlist), gửi liên hệ hỗ trợ, để lại đánh giá sau chuyến đi, chat trực tiếp với nhân viên hỗ trợ (realtime), và dùng chatbot AI tư vấn 24/7.',
  'Bảo mật tài khoản sử dụng JWT. Thanh toán tích hợp PayOS an toàn.'
].join(' ');

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

  // ── Từ khóa du lịch cơ bản ──
  const travelKeywords = [
    'tour', 'du lịch', 'du lich', 'đi đâu', 'di dau', 'điểm đến', 'diem den',
    'lịch trình', 'lich trinh', 'giá', 'bao nhiêu', 'còn chỗ', 'con cho',
    'chuyến đi', 'chuyen di', 'tham quan', 'khám phá', 'kham pha',
    'nghỉ dưỡng', 'nghi duong', 'destination', 'trip', 'travel', 'book tour', 'đặt tour'
  ];
  const bookingKeywords = ['đặt tour', 'dat tour', 'booking', 'book tour', 'thanh toán', 'thanh toan', 'pay'];

  const hasTravelIntent = travelKeywords.some(k => lower.includes(k));
  const hasBookingIntent = bookingKeywords.some(k => lower.includes(k));

  // ── Giá ──
  const priceMatch = lower.match(/(\d+)\s*(triệu|trieu|million)/i);
  const maxPrice = priceMatch ? Number(priceMatch[1]) * 1_000_000 : null;
  const minPriceMatch = lower.match(/(?:từ|trên|hơn|over)\s*(\d+)\s*(triệu|trieu)/i);
  const minPrice = minPriceMatch ? Number(minPriceMatch[1]) * 1_000_000 : null;

  // ── Điểm đến ──
  const knownDests = [
    'đà nẵng','da nang','phú quốc','phu quoc','hội an','hoi an','hà nội','ha noi',
    'hồ chí minh','sai gon','nha trang','đà lạt','da lat','hạ long','ha long',
    'huế','hue','cần thơ','can tho','nghệ an','nghe an','hà tĩnh','ha tinh',
    'quảng bình','quang binh','quảng trị','quang tri','quảng nam','quang nam',
    'quảng ngãi','quang ngai','bình định','binh dinh','phú yên','phu yen',
    'khánh hòa','khanh hoa','ninh thuận','ninh thuan','bình thuận','binh thuan',
    'vũng tàu','vung tau','tiền giang','tien giang','bến tre','ben tre',
    'vĩnh long','vinh long','đồng tháp','dong thap','an giang','kiên giang','kien giang',
    'sapa','sa pa','mộc châu','moc chau','điện biên','dien bien','hòa bình','hoa binh',
    'ninh bình','ninh binh','thanh hóa','thanh hoa','phan thiết','phan thiet',
    'mũi né','mui ne','côn đảo','con dao','đồng nai','dong nai','bình dương','binh duong',
    'tây ninh','tay ninh','lào cai','lao cai','yên bái','yen bai','tuyên quang','tuyen quang',
    'hà giang','ha giang','cao bằng','cao bang','lạng sơn','lang son'
  ];
  let destFilter = null;
  for (const dest of knownDests) { if (lower.includes(dest)) { destFilter = dest; break; } }

  // ── Loại tour (category) ──
  const categoryMap = [
    { keys: ['biển','bien','đảo','dao','bãi biển','bai bien','ven biển','nghỉ biển','resort'], cat: 'bien-dao' },
    { keys: ['miền bắc','mien bac','bắc bộ','bac bo'], cat: 'mien-bac' },
    { keys: ['miền trung','mien trung','trung bộ','trung bo'], cat: 'mien-trung' },
    { keys: ['miền nam','mien nam','nam bộ','nam bo','sông nước','song nuoc','mekong'], cat: 'mien-nam' },
    { keys: ['nước ngoài','nuoc ngoai','quốc tế','quoc te','abroad','international','overseas'], cat: 'nuoc-ngoai' },
    { keys: ['trekking','leo núi','leo nui','phượt','phuot','mạo hiểm','mao hiem','cắm trại','camping'], cat: 'trekking' },
    { keys: ['tâm linh','tam linh','chùa','chua','đền','den','phật','phat','hành hương','hanh huong'], cat: 'tam-linh' },
  ];
  let categoryFilter = null;
  for (const { keys, cat } of categoryMap) {
    if (keys.some(k => lower.includes(k))) { categoryFilter = cat; break; }
  }

  // ── Phương tiện ──
  let transportFilter = null;
  if (['máy bay','may bay','đi bay','di bay','flight','fly'].some(k => lower.includes(k))) transportFilter = 'may-bay';
  else if (['tàu hỏa','tau hoa','xe lửa','xe lua','train'].some(k => lower.includes(k))) transportFilter = 'tau-hoa';
  else if (['giường nằm','giuong nam','xe giường','sleeper'].some(k => lower.includes(k))) transportFilter = 'oto-giuong-nam';
  else if (['ô tô','o to','xe khách','xe khach','xe coach','xe du lịch'].some(k => lower.includes(k))) transportFilter = 'oto-du-lich';

  // ── Tháng / Mùa ──
  let monthFilter = null;
  const monthPatterns = [
    { keys: ['tháng 1 ','tháng một','t1/','tháng 01'], m: [1] },
    { keys: ['tháng 2 ','tháng hai','t2/','tháng 02'], m: [2] },
    { keys: ['tháng 3 ','tháng ba','t3/','tháng 03','8/3','quốc tế phụ nữ'], m: [3] },
    { keys: ['tháng 4 ','tháng tư','t4/','tháng 04','30/4','giải phóng'], m: [4] },
    { keys: ['tháng 5 ','tháng năm','t5/','tháng 05','1/5','lao động'], m: [5] },
    { keys: ['tháng 6 ','tháng sáu','t6/','tháng 06'], m: [6] },
    { keys: ['tháng 7 ','tháng bảy','t7/','tháng 07'], m: [7] },
    { keys: ['tháng 8 ','tháng tám','t8/','tháng 08'], m: [8] },
    { keys: ['tháng 9 ','tháng chín','t9/','tháng 09','2/9','quốc khánh'], m: [9] },
    { keys: ['tháng 10','tháng mười ','t10/'], m: [10] },
    { keys: ['tháng 11','tháng mười một','t11/'], m: [11] },
    { keys: ['tháng 12','tháng mười hai','t12/'], m: [12] },
    { keys: ['mùa hè','mua he','hè ','he ','summer','dịp hè'], m: [6,7,8] },
    { keys: ['mùa thu','mua thu','autumn','fall'], m: [9,10,11] },
    { keys: ['mùa đông','mua dong','winter'], m: [12,1,2] },
    { keys: ['mùa xuân','mua xuan','spring'], m: [3,4,5] },
    { keys: ['tết ','tet ','nguyên đán','nguyen dan'], m: [1,2] },
    { keys: ['lễ 30/4','dip 30/4','lễ lao động'], m: [4,5] },
  ];
  for (const { keys, m } of monthPatterns) {
    if (keys.some(k => lower.includes(k))) { monthFilter = m; break; }
  }

  // ── Số ngày ──
  let durationDays = null;
  const durMatch = lower.match(/(\d+)\s*(?:ngày|ngay|days?)/);
  if (durMatch) durationDays = Number(durMatch[1]);
  else if (['cuối tuần','cuoi tuan','weekend','2 ngày'].some(k => lower.includes(k))) durationDays = 2;
  else if (['ngắn ngày','ngan ngay','1 ngày','day trip'].some(k => lower.includes(k))) durationDays = 1;

  // ── So sánh / sắp xếp ──
  let sortBy = null;
  let questionType = null;
  if (['giá rẻ nhất','rẻ nhất','re nhat','ít tiền nhất','rẻ tiền','giá thấp nhất','tiết kiệm nhất','gia re','budget'].some(k => lower.includes(k))) {
    sortBy = 'price_asc'; questionType = 'cheapest';
  } else if (['giá cao nhất','đắt nhất','dat nhat','cao cấp nhất','sang trọng nhất','luxury','premium','vip'].some(k => lower.includes(k))) {
    sortBy = 'price_desc'; questionType = 'most_expensive';
  } else if (['còn nhiều chỗ','nhiều chỗ nhất','chỗ trống nhiều','nhiều slot'].some(k => lower.includes(k))) {
    sortBy = 'slots_desc'; questionType = 'most_available';
  } else if (['sắp diễn ra','sắp khởi hành','sắp tới','gần nhất','tour mới nhất','sap khai','upcoming'].some(k => lower.includes(k))) {
    sortBy = 'date_asc'; questionType = 'upcoming';
  } else if (['gợi ý','goi y','đề xuất','nên đi đâu','tour nào hay','phù hợp','tư vấn','tu van','recommend'].some(k => lower.includes(k))) {
    sortBy = 'slots_desc'; questionType = 'recommend';
  }

  // ── FAQ ──
  if (!questionType) {
    if (['hủy tour','huy tour','hủy booking','hủy đặt','cancel tour','huỷ tour'].some(k => lower.includes(k)))                                           questionType = 'cancel_policy';
    else if (['hoàn tiền','hoan tien','refund','hoàn cọc','hoàn lại tiền'].some(k => lower.includes(k)))                                                  questionType = 'refund_policy';
    else if (['cách thanh toán','thanh toán như thế nào','phương thức thanh toán','cach thanh toan','payos','cách trả tiền'].some(k => lower.includes(k))) questionType = 'payment_info';
    else if (['liên hệ','lien he','số điện thoại','so dien thoai','hotline','địa chỉ','dia chi','contact'].some(k => lower.includes(k)))                   questionType = 'contact_info';
    else if (['trẻ em','tre em','bé ','be ','con nhỏ','con nho','children','kids','baby'].some(k => lower.includes(k)))                                    questionType = 'children_tour';
    else if (['người cao tuổi','nguoi cao tuoi','senior','cao niên','ông bà','ba mẹ','cha mẹ già'].some(k => lower.includes(k)))                           questionType = 'senior_tour';
    else if (['đoàn','doan','nhóm lớn','nhom lon','tập thể','tap the','team building','đặt theo nhóm','tour đoàn','tour nhom'].some(k => lower.includes(k)))                 questionType = 'group_tour';
    else if (['wishlist','yêu thích','yeu thich','lưu tour','danh sách yêu'].some(k => lower.includes(k)))                                                questionType = 'wishlist_help';
    else if (['đánh giá','danh gia','review','nhận xét','feedback','rating'].some(k => lower.includes(k)))                                                questionType = 'review_help';
    else if (['đăng ký','dang ky','tạo tài khoản','register','sign up','tao tai khoan'].some(k => lower.includes(k)))                                     questionType = 'account_register';
    else if (['quên mật khẩu','quen mat khau','đổi mật khẩu','forgot password','reset','đổi pass'].some(k => lower.includes(k)))                          questionType = 'account_password';
    else if (['lịch sử','lich su','đã đặt','da dat','booking của tôi','my booking','booking history'].some(k => lower.includes(k)))                       questionType = 'booking_history';
    else if (['bảo hiểm','bao hiem','insurance','an toàn du lịch'].some(k => lower.includes(k)))                                                          questionType = 'insurance_info';
  }

  const hasBookingGuide = ['hướng dẫn đặt','cách đặt','quy trình đặt','đặt như thế nào','dat nhu the nao'].some(k => lower.includes(k));
  const wantsAllTours = ['tất cả tour','tat ca tour','toàn bộ tour','liệt kê tour','danh sách tour','danh sach tour','các tour của công ty','tour của công ty','mọi tour','all tours'].some(k => lower.includes(k));
  const hasAnyFilter = Boolean(maxPrice || minPrice || destFilter || categoryFilter || transportFilter || monthFilter || durationDays || sortBy || questionType);

  return {
    hasTravelIntent: hasTravelIntent || hasAnyFilter || hasBookingIntent || wantsAllTours,
    hasBookingIntent: hasBookingIntent || hasBookingGuide,
    hasBookingGuide,
    wantsAllTours,
    maxPrice, minPrice,
    destFilter,
    categoryFilter, transportFilter,
    monthFilter, durationDays,
    sortBy, questionType
  };
}

async function getRelevantTours(message) {
  const intent = detectTourIntent(message);
  if (!intent.hasTravelIntent) {
    return [];
  }

  const baseWhere = intent.wantsAllTours ? '1 = 1' : 'slots > 0 AND start_date >= CURDATE()';
  const orderLimit = intent.wantsAllTours ? 'ORDER BY start_date ASC, id ASC LIMIT 50' : 'ORDER BY slots DESC LIMIT 5';

  const SELECT_COLS = 'id, title, destination, category, transport, departure_point, price, start_date, end_date, slots, itinerary';

  const sortMap = { price_asc: 'price ASC', price_desc: 'price DESC', slots_desc: 'slots DESC', date_asc: 'start_date ASC' };

  // Helper: build query với filters tùy ý
  const buildFiltered = async (extraWhere = [], extraParams = [], orderBy = 'slots DESC', limit = 5) => {
    const base = intent.wantsAllTours ? [] : ['slots > 0', 'start_date >= CURDATE()'];
    const all = [...base, ...extraWhere];
    const where = all.length ? 'WHERE ' + all.join(' AND ') : '';
    const [rows] = await pool.execute(
      `SELECT ${SELECT_COLS} FROM tours ${where} ORDER BY ${orderBy} LIMIT ${limit}`,
      extraParams
    );
    return rows;
  };

  // ── Sort intent (rẻ nhất, đắt nhất...) kết hợp với các filter khác ──
  if (intent.sortBy) {
    const orderBy = sortMap[intent.sortBy] || 'slots DESC';
    const limit = ['cheapest', 'most_expensive'].includes(intent.questionType) ? 3 : 5;
    const where = []; const params = [];
    if (intent.destFilter)      { where.push('LOWER(destination) LIKE ?'); params.push(`%${intent.destFilter}%`); }
    if (intent.categoryFilter)  { where.push('category = ?');              params.push(intent.categoryFilter); }
    if (intent.maxPrice)        { where.push('price <= ?');                params.push(intent.maxPrice); }
    if (intent.minPrice)        { where.push('price >= ?');                params.push(intent.minPrice); }
    const rows = await buildFiltered(where, params, orderBy, limit);
    if (rows.length > 0) return rows.map(mapTour);
  }

  // ── Filter điểm đến ──
  if (intent.destFilter) {
    const where = ['LOWER(destination) LIKE ?']; const params = [`%${intent.destFilter}%`];
    if (intent.maxPrice)       { where.push('price <= ?');   params.push(intent.maxPrice); }
    if (intent.categoryFilter) { where.push('category = ?'); params.push(intent.categoryFilter); }
    const rows = await buildFiltered(where, params, 'slots DESC', 5);
    if (rows.length > 0) return rows.map(mapTour);
    // fallback: tìm theo title
    const [titleRows] = await pool.execute(
      `SELECT ${SELECT_COLS} FROM tours WHERE slots > 0 AND start_date >= CURDATE() AND LOWER(title) LIKE ? ORDER BY slots DESC LIMIT 5`,
      [`%${intent.destFilter}%`]
    );
    return titleRows.map(mapTour);
  }

  // ── Filter loại tour (category) ──
  if (intent.categoryFilter) {
    const where = ['category = ?']; const params = [intent.categoryFilter];
    if (intent.maxPrice)        { where.push('price <= ?');           params.push(intent.maxPrice); }
    if (intent.transportFilter) { where.push('transport = ?');        params.push(intent.transportFilter); }
    if (intent.monthFilter) {
      const months = Array.isArray(intent.monthFilter) ? intent.monthFilter : [intent.monthFilter];
      where.push(`MONTH(start_date) IN (${months.map(() => '?').join(',')})`);
      params.push(...months);
    }
    const rows = await buildFiltered(where, params, 'slots DESC', 5);
    if (rows.length > 0) return rows.map(mapTour);
    // fallback: bỏ filter phụ, giữ category
    const [fallback] = await pool.execute(
      `SELECT ${SELECT_COLS} FROM tours WHERE slots > 0 AND start_date >= CURDATE() AND category = ? ORDER BY slots DESC LIMIT 5`,
      [intent.categoryFilter]
    );
    return fallback.map(mapTour);
  }

  // ── Filter tháng / mùa ──
  if (intent.monthFilter) {
    const months = Array.isArray(intent.monthFilter) ? intent.monthFilter : [intent.monthFilter];
    const where = [`MONTH(start_date) IN (${months.map(() => '?').join(',')})`];
    const params = [...months];
    if (intent.maxPrice)        { where.push('price <= ?');    params.push(intent.maxPrice); }
    if (intent.transportFilter) { where.push('transport = ?'); params.push(intent.transportFilter); }
    const rows = await buildFiltered(where, params, 'start_date ASC', 5);
    if (rows.length > 0) return rows.map(mapTour);
  }

  // ── Filter giá ──
  if (intent.maxPrice || intent.minPrice) {
    const where = []; const params = [];
    if (intent.maxPrice) { where.push('price <= ?'); params.push(intent.maxPrice); }
    if (intent.minPrice) { where.push('price >= ?'); params.push(intent.minPrice); }
    const rows = await buildFiltered(where, params, 'price ASC', 5);
    if (rows.length > 0) return rows.map(mapTour);
  }

  // ── Filter phương tiện ──
  if (intent.transportFilter) {
    const rows = await buildFiltered(['transport = ?'], [intent.transportFilter], 'slots DESC', 5);
    if (rows.length > 0) return rows.map(mapTour);
  }

  // ── Trích từ khóa (loại bỏ stop words) ──
  const stopWords = new Set(['tour','nào','nao','hay','vay','vậy','thú','vị','giá','thế','bao','nhiêu','nhất','nhat','còn','cho','chỗ','tôi','toi','bạn','ban','mình','minh','hỏi','muốn','muon','được','duoc','như','nhu','làm','lam']);
  const words = message.toLowerCase().replace(/[^a-zA-Zàáảãạăắặằẳẵâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
  if (words.length > 0) {
    const likeClauses = words.map(() => '(LOWER(title) LIKE ? OR LOWER(destination) LIKE ?)').join(' OR ');
    const params = words.flatMap(w => [`%${w}%`, `%${w}%`]);
    const [keywordRows] = await pool.execute(
      `SELECT ${SELECT_COLS} FROM tours WHERE slots > 0 AND start_date >= CURDATE() AND (${likeClauses}) ORDER BY slots DESC LIMIT 5`,
      params
    );
    if (keywordRows.length > 0) return keywordRows.map(mapTour);
  }

  // ── Fallback: top upcoming tours ──
  const [fallbackRows] = await pool.execute(
    `SELECT ${SELECT_COLS} FROM tours WHERE ${baseWhere} ${orderLimit}`
  );
  if (fallbackRows.length > 0) return fallbackRows.map(mapTour);

  // ── Final fallback: bỏ filter ngày, lấy tour gần nhất ──
  const [anyRows] = await pool.execute(
    `SELECT ${SELECT_COLS} FROM tours WHERE slots > 0 ORDER BY start_date DESC LIMIT 5`
  );
  return anyRows.map(mapTour);
}

function mapTour(t) {
  return {
    id: t.id,
    title: t.title,
    destination: t.destination,
    category: t.category || '',
    transport: t.transport || '',
    departurePoint: t.departure_point || '',
    price: t.price,
    startDate: t.start_date,
    endDate: t.end_date,
    availableSlots: t.slots,
    itinerary: t.itinerary || ''
  };
}

function formatDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  // Format dd/mm/yyyy theo múi giờ Việt Nam (UTC+7)
  const offset = 7 * 60;
  const local = new Date(dt.getTime() + offset * 60000);
  const dd = String(local.getUTCDate()).padStart(2, '0');
  const mm = String(local.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = local.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

async function getSystemSnapshot() {
  const [
    [tourStatsRows],
    [articleRows],
    [userRows],
    [bookingRows],
    [reviewRows],
    [wishlistRows],
    [contactRows]
  ] = await Promise.all([
    pool.execute(
      `SELECT 
        COUNT(*) AS totalTours,
        SUM(CASE WHEN start_date >= CURDATE() THEN 1 ELSE 0 END) AS upcomingTours,
        SUM(CASE WHEN start_date >= CURDATE() THEN slots ELSE 0 END) AS openSlots
      FROM tours`
    ),
    pool.execute('SELECT COUNT(*) AS totalArticles FROM articles'),
    pool.execute('SELECT COUNT(*) AS totalUsers FROM users'),
    pool.execute('SELECT COUNT(*) AS totalBookings FROM bookings'),
    pool.execute('SELECT COUNT(*) AS totalReviews FROM reviews'),
    pool.execute('SELECT COUNT(*) AS totalWishlists FROM wishlists'),
    pool.execute('SELECT COUNT(*) AS totalContacts FROM contact_messages')
  ]);

  const tourStats = tourStatsRows[0] || {};
  const articleStats = articleRows[0] || {};
  const userStats = userRows[0] || {};
  const bookingStats = bookingRows[0] || {};
  const reviewStats = reviewRows[0] || {};
  const wishlistStats = wishlistRows[0] || {};
  const contactStats = contactRows[0] || {};

  return {
    totalTours: Number(tourStats.totalTours || 0),
    upcomingTours: Number(tourStats.upcomingTours || 0),
    openSlots: Number(tourStats.openSlots || 0),
    totalArticles: Number(articleStats.totalArticles || 0),
    totalUsers: Number(userStats.totalUsers || 0),
    totalBookings: Number(bookingStats.totalBookings || 0),
    totalReviews: Number(reviewStats.totalReviews || 0),
    totalWishlists: Number(wishlistStats.totalWishlists || 0),
    totalContacts: Number(contactStats.totalContacts || 0)
  };
}

const CATEGORY_LABEL = {
  'bien-dao': 'Biển & Đảo', 'mien-bac': 'Miền Bắc', 'mien-trung': 'Miền Trung',
  'mien-nam': 'Miền Nam', 'nuoc-ngoai': 'Nước ngoài', 'trekking': 'Trekking', 'tam-linh': 'Tâm linh'
};
const TRANSPORT_LABEL = {
  'may-bay': 'máy bay', 'oto-giuong-nam': 'ô tô giường nằm',
  'tau-hoa': 'tàu hỏa', 'oto-du-lich': 'ô tô du lịch'
};

function buildToursContext(tours, message) {
  const intent = detectTourIntent(message);

  if (tours.length === 0) {
    return 'Không có danh sách tour phù hợp nào được truy xuất cho câu hỏi này; chỉ giới thiệu tour khi câu hỏi thực sự liên quan đến tour, lịch trình, giá hoặc đặt chỗ.';
  }

  const prefix = intent.wantsAllTours
    ? `Danh sách tour đang có trong hệ thống (${tours.length} tour):`
    : `Dữ liệu tour phù hợp với câu hỏi (${tours.length} tour):`;  const tourDetails = tours.map((t) => {
    const price = Number(t.price).toLocaleString('vi-VN');
    const start = formatDate(t.startDate);
    const end = formatDate(t.endDate);
    const cat = CATEGORY_LABEL[t.category] || t.category || '';
    const transport = TRANSPORT_LABEL[t.transport] || t.transport || '';
    const depart = t.departurePoint ? `khởi hành từ ${t.departurePoint}` : '';
    const itinerary = t.itinerary ? `Lịch trình chi tiết: [${t.itinerary.replace(/\n/g, ' | ')}]` : '';
    return [
      `TÊN: ${t.title}`,
      `Điểm đến: ${t.destination}`,
      cat ? `Loại: ${cat}` : '',
      transport ? `Di chuyển: ${transport}` : '',
      depart,
      `Giá: ${price} VND`,
      `Ngày đi: ${start}`,
      `Ngày về: ${end}`,
      `Còn ${t.availableSlots} chỗ trống`,
      itinerary
    ].filter(Boolean).join(', ');
  }).join('\n');

  return `${prefix}\n${tourDetails}`;
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

function buildSystemPrompt({ message, tours, systemSnapshot }) {
  const toursCtx = buildToursContext(tours, message);
  const intent = detectTourIntent(message);

  // ── Gợi ý xử lý theo loại câu hỏi ──
  const intentHints = {
    cheapest:         '→ Trả lời: Chỉ rõ tour GIÁ RẺ NHẤT (index 0 đã sort price ASC). Nêu tên tour, giá chính xác, ngày đi, còn mấy chỗ. Liệt kê thêm 2 tour rẻ tiếp theo.',
    most_expensive:   '→ Trả lời: Chỉ rõ tour GIÁ CAO NHẤT (index 0 đã sort price DESC). Nêu điểm đặc biệt của tour cao cấp này.',
    most_available:   '→ Trả lời: Chỉ rõ tour CÒN NHIỀU CHỖ NHẤT (index 0 đã sort slots DESC). Nêu số chỗ còn lại.',
    upcoming:         '→ Trả lời: Chỉ rõ tour KHỞI HÀNH SỚM NHẤT (index 0 đã sort start_date ASC). Nêu ngày khởi hành cụ thể.',
    recommend:        '→ Trả lời: Gợi ý 2–3 tour PHỔI BẬT với lý do ngắn gọn vì sao phù hợp.',
    cancel_policy:    '→ Trả lời chính sách hủy: Hủy trước 7 ngày = hoàn 80%; 3–6 ngày = 50%; 1–2 ngày = 20%; trong ngày = 0%.',
    refund_policy:    '→ Trả lời chính sách hoàn tiền: 3–7 ngày làm việc, cùng phương thức thanh toán. Tour bị hủy bởi công ty = hoàn 100%.',
    payment_info:     '→ Trả lời thanh toán: PayOS (QR/chuyển khoản ngân hàng). Quy trình: đặt tour → chọn ngày → thanh toán PayOS → xác nhận tự động qua email.',
    contact_info:     '→ Trả lời liên hệ: Hotline 0909 123 456 (8h–21h), email support@hk2travel.vn, địa chỉ 123 Nguyễn Văn Linh, Đà Nẵng.',
    group_tour:       '→ Trả lời tour đoàn: Từ 10 người giảm 5–10%. Từ 20 người có thể đặt xe riêng, HDV riêng. Liên hệ để báo giá.',
    children_tour:    '→ Trả lời: Trẻ <2t miễn phí, 2–11t giảm 30–50%, từ 12t tính người lớn. Gợi ý tour biển, miền Tây phù hợp gia đình.',
    senior_tour:      '→ Trả lời: Người từ 60t giảm 10%. Gợi ý tour tâm linh, biển nghỉ dưỡng, tour ngắn ngày nhịp độ nhẹ nhàng.',
    wishlist_help:    '→ Trả lời: Nhấn ♡ trên tour để lưu. Xem tại menu "Yêu thích". Cần đăng nhập.',
    review_help:      '→ Trả lời: Vào "Booking của tôi" → chọn tour đã đi → "Đánh giá ngay" → chọn sao + nhận xét.',
    account_register: '→ Trả lời: Bấm "Đăng ký" → nhập email + mật khẩu → xác nhận email. Hoặc đăng nhập Google/Facebook.',
    account_password: '→ Trả lời: Trang đăng nhập → "Quên mật khẩu?" → nhập email → làm theo link trong email (hiệu lực 30 phút).',
    booking_history:  '→ Trả lời: Đăng nhập → tên tài khoản góc phải → "Đặt tour của tôi" → xem danh sách booking.',
    insurance_info:   '→ Trả lời: Mọi tour đều có bảo hiểm tai nạn cơ bản. Mang CMND/CCCD khi đi tour.',
  };
  const intentHint = intent.questionType ? (intentHints[intent.questionType] || '') : '';

  // ── Context filter hiện tại ──
  const filterCtx = (() => {
    const parts = [];
    if (intent.categoryFilter)  parts.push(`Loại tour: ${CATEGORY_LABEL[intent.categoryFilter] || intent.categoryFilter}`);
    if (intent.transportFilter) parts.push(`Phương tiện: ${TRANSPORT_LABEL[intent.transportFilter] || intent.transportFilter}`);
    if (intent.destFilter)      parts.push(`Điểm đến: ${intent.destFilter}`);
    if (intent.monthFilter)     parts.push(`Tháng: ${(Array.isArray(intent.monthFilter) ? intent.monthFilter : [intent.monthFilter]).join(', ')}`);
    if (intent.maxPrice)        parts.push(`Giá tối đa: ${Number(intent.maxPrice).toLocaleString('vi-VN')} VND`);
    if (intent.minPrice)        parts.push(`Giá tối thiểu: ${Number(intent.minPrice).toLocaleString('vi-VN')} VND`);
    return parts.length ? `[Bộ lọc đang dùng: ${parts.join(' | ')}]` : '';
  })();

  // ── Context tổng quan hệ thống ──
  const systemCtx = `HK2 Travel hiện có ${systemSnapshot.totalTours} tour, ${systemSnapshot.upcomingTours} tour sắp khởi hành còn ${systemSnapshot.openSlots} chỗ trống, ${systemSnapshot.totalArticles} bài viết, ${systemSnapshot.totalBookings} lượt đặt, ${systemSnapshot.totalReviews} đánh giá.`;

  return `Bạn là **trợ lý AI chuyên nghiệp của HK2 Travel** — công ty du lịch trực tuyến tại Việt Nam.

## VAI TRÒ
Tư vấn khách hàng về: tour du lịch, đặt tour, thanh toán, chính sách, tài khoản. KHÔNG trả lời chủ đề ngoài phạm vi này.

## NGUYÊN TẮC VÀNG
1. **Đọc kỹ câu hỏi** — xác định chính xác khách hỏi GÌ trước khi trả lời.
2. **Trả lời đúng trọng tâm** — không lan man, không lặp lại thông tin thừa.
3. **Chỉ dùng dữ liệu được cung cấp** — không bịa tên tour, giá, ngày.
4. **Định lượng cụ thể** — nêu rõ giá, ngày, số chỗ khi hỏi về tour.
5. **Tiếng Việt thân thiện** — xưng "mình/bạn", tránh quá trang trọng.

## FORMAT TRẢ LỜI
- Câu hỏi về 1 tour cụ thể: trả lời ngắn, đủ thông tin (tên, giá, ngày, chỗ, lịch trình nếu hỏi).
- Câu hỏi so sánh (rẻ nhất, đắt nhất…): nêu ngay kết quả, sau đó liệt kê bảng nếu cần.
- Câu hỏi FAQ (hủy, thanh toán…): trả lời bullet points rõ ràng.
- Câu hỏi gợi ý: đề xuất 2–3 lựa chọn với lý do phù hợp.
- KHÔNG mở đầu bằng "Dạ", "Chào bạn" mỗi câu trả lời — trả lời thẳng vào nội dung.

## XỬ LÝ LOẠI CÂU HỎI HIỆN TẠI
${intentHint || '→ Tư vấn thông thường: đọc danh sách tour bên dưới và trả lời dựa trên dữ liệu thực.'}

## THÔNG TIN HỆ THỐNG
${systemCtx}
${filterCtx}

## TÍNH NĂNG HK2 TRAVEL
${PROJECT_CAPABILITIES}

## QUY TRÌNH ĐẶT TOUR
Đăng nhập → Chọn tour → Chọn ngày/số người → Đặt tour → Thanh toán PayOS (QR/chuyển khoản) → Email xác nhận tự động → Xem lịch sử trong "Booking của tôi".

## DỮ LIỆU TOUR (chỉ dùng thông tin này, không thêm bớt)
${toursCtx}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tryGeminiModel(modelId, apiKey, requestBody, maxRetries = 2, retryDelayMs = 1500) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) await sleep(retryDelayMs);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const msg = data?.error?.message || 'Gemini API request failed';
        const isRetryable = response.status === 429 || response.status === 503 ||
          msg.toLowerCase().includes('demand') || msg.toLowerCase().includes('quota');
        lastError = new Error(msg);
        if (!isRetryable) break; // không retry với lỗi khác (auth, bad request...)
        continue;
      }
      const reply = data?.candidates?.[0]?.content?.parts
        ?.map((part) => String(part?.text || '').trim())
        .filter(Boolean)
        .join('\n')
        .trim();
      if (reply) return reply;
      lastError = new Error('Gemini returned empty content');
      break;
    } catch (networkErr) {
      lastError = networkErr;
    }
  }
  throw lastError || new Error('Gemini model failed');
}

async function askGemini(message, tours, history, systemSnapshot) {
  const GEMINI_API_KEY = getGeminiApiKey();
  if (!GEMINI_API_KEY) return null;

  const intent = detectTourIntent(message);

  const contents = normalizeHistory(history).map((item) => ({
    role: item.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: item.text }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const requestBody = {
    systemInstruction: {
      parts: [{ text: buildSystemPrompt({ message, tours, systemSnapshot }) }]
    },
    contents,
    generationConfig: {
      temperature: 0.35,   // thấp hơn → trả lời chính xác, ít "sáng tạo" lung tung
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024  // giới hạn để tránh câu trả lời dài dòng
    }
  };

  let lastError = null;

  for (const candidate of getGeminiModelCandidates()) {
    const modelId = candidate.startsWith('models/') ? candidate.slice('models/'.length) : candidate;
    try {
      const reply = await tryGeminiModel(modelId, GEMINI_API_KEY, requestBody);
      return { reply, tours, suggestions: getDynamicSuggestions(intent.questionType), source: 'gemini' };
    } catch (err) {
      console.warn(`[AI] Gemini model ${modelId} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error('Gemini API request failed');
}

// ── FAQ: câu trả lời cố định cho các câu hỏi thường gặp ──
const FAQ = {
  cancel_policy: {
    reply: `**Chính sách hủy tour của HK2 Travel:**\n\n• **Hủy trước 7 ngày**: Hoàn tiền 80% (giữ lại 20% phí xử lý)\n• **Hủy trước 3–6 ngày**: Hoàn tiền 50%\n• **Hủy trước 1–2 ngày**: Hoàn tiền 20%\n• **Hủy trong ngày hoặc no-show**: Không hoàn tiền\n\nĐể hủy, vui lòng vào mục **"Booking của tôi"** trong tài khoản hoặc liên hệ hotline để được hỗ trợ.`,
    suggestions: ['Chính sách hoàn tiền?', 'Liên hệ hỗ trợ', 'Hướng dẫn đặt tour']
  },
  refund_policy: {
    reply: `**Chính sách hoàn tiền HK2 Travel:**\n\n• Tiền hoàn được chuyển về tài khoản / ví trong **3–7 ngày làm việc** sau khi xác nhận hủy\n• Phương thức hoàn: cùng phương thức thanh toán ban đầu (PayOS, chuyển khoản...)\n• Trường hợp hủy do **lỗi hệ thống / tour bị hủy**: hoàn 100% trong 24h\n\nNếu sau 7 ngày chưa nhận được tiền, hãy liên hệ để chúng tôi kiểm tra.`,
    suggestions: ['Chính sách hủy tour?', 'Liên hệ hỗ trợ', 'Hướng dẫn đặt tour']
  },
  payment_info: {
    reply: `**Các phương thức thanh toán tại HK2 Travel:**\n\n1. **PayOS** (QR Code / chuyển khoản ngân hàng) — an toàn, xác nhận tự động\n2. **Thanh toán khi đến văn phòng** (nếu gần khu vực)\n\n*Cách thanh toán online:*\n> Đặt tour → Chọn ngày/số người → Bấm **"Đặt ngay"** → Hệ thống chuyển sang trang PayOS → Quét QR hoặc chuyển khoản → Nhận email xác nhận.\n\nMọi giao dịch đều có mã xác nhận gửi qua email ngay lập tức.`,
    suggestions: ['Hướng dẫn đặt tour', 'Chính sách hủy tour?', 'Tour nào giá rẻ nhất?']
  },
  contact_info: {
    reply: `**Liên hệ HK2 Travel:**\n\n• **Hotline / Zalo**: 0909 123 456 (8h–21h mỗi ngày)\n• **Email**: support@hk2travel.vn\n• **Địa chỉ**: 123 Nguyễn Văn Linh, Đà Nẵng\n• **Facebook**: fb.com/hk2travel\n\nĐội ngũ hỗ trợ luôn sẵn sàng giải đáp trong vòng **15 phút** trong giờ làm việc!`,
    suggestions: ['Hướng dẫn đặt tour', 'Chính sách hủy tour?', 'Danh sách tất cả tour']
  },
  group_tour: {
    reply: `**Tour theo đoàn / nhóm / gia đình tại HK2 Travel:**\n\n• Nhóm từ **10 người trở lên** được giảm **5–10%** tổng giá trị\n• Nhóm từ **20 người**: có thể yêu cầu xe riêng, hướng dẫn viên riêng\n• Hỗ trợ **lên lịch trình riêng** theo yêu cầu của đoàn\n• Phù hợp: gia đình, cơ quan, trường học, team building\n\nĐể đặt tour đoàn, vui lòng liên hệ trực tiếp để được tư vấn và báo giá tốt nhất!`,
    suggestions: ['Tour còn nhiều chỗ nhất?', 'Liên hệ hỗ trợ', 'Hướng dẫn đặt tour']
  },
  children_tour: {
    reply: `**Tour phù hợp cho gia đình có trẻ em:**\n\n• **Trẻ dưới 2 tuổi**: miễn phí (không có chỗ ngồi riêng)\n• **Trẻ 2–11 tuổi**: giảm 30–50% tùy tour\n• **Trẻ từ 12 tuổi**: tính giá người lớn\n\n**Gợi ý tour thân thiện cho trẻ em:**\n> 🏖 Tour biển đảo (bơi lội, vui chơi)\n> 🌿 Tour miền Tây sông nước (yên bình, an toàn)\n> 🏯 Tour Đà Nẵng – Hội An (nhiều hoạt động vui)\n\nTất cả xe du lịch đều có điều hòa, ghế trẻ em nếu cần.`,
    suggestions: ['Tour biển đảo có gì?', 'Tour ngắn ngày phù hợp?', 'Hướng dẫn đặt tour']
  },
  senior_tour: {
    reply: `**Tour phù hợp cho người cao tuổi / ông bà:**\n\n• Ưu tiên tour **ngắn ngày** (1–3 ngày), nhịp độ nhẹ nhàng\n• Xe du lịch cao cấp có điều hòa, ghế ngả\n• Hướng dẫn viên hỗ trợ tận tình\n• **Người từ 60 tuổi**: giảm 10% tại nhiều tour\n\n**Gợi ý phù hợp:**\n> 🙏 Tour tâm linh – chùa chiền\n> 🌊 Tour biển nghỉ dưỡng\n> 🌸 Tour Huế – di tích lịch sử\n\nVui lòng thông báo khi đặt nếu có người cao tuổi để được chăm sóc đặc biệt.`,
    suggestions: ['Tour tâm linh có gì?', 'Tour biển nghỉ dưỡng?', 'Liên hệ hỗ trợ']
  },
  wishlist_help: {
    reply: `**Tính năng Yêu thích (Wishlist):**\n\n• Bấm biểu tượng **♡ (trái tim)** trên bất kỳ tour nào để lưu vào danh sách yêu thích\n• Xem lại tại menu **"Yêu thích"** trên thanh điều hướng\n• Dễ dàng so sánh và đặt tour sau\n\n*Lưu ý: Tính năng yêu thích chỉ hoạt động khi bạn đã đăng nhập.*`,
    suggestions: ['Hướng dẫn đặt tour', 'Tour nào hay gợi ý?', 'Danh sách tất cả tour']
  },
  review_help: {
    reply: `**Cách đánh giá / review tour:**\n\n1. Hoàn thành chuyến đi\n2. Vào mục **"Booking của tôi"** → chọn tour đã đi\n3. Bấm **"Đánh giá ngay"** và chọn số sao + nhận xét\n\n• Đánh giá giúp du khách khác có thêm thông tin tin cậy\n• HK2 Travel trân trọng mọi phản hồi trung thực!`,
    suggestions: ['Hướng dẫn đặt tour', 'Tour nào giá rẻ nhất?', 'Liên hệ hỗ trợ']
  },
  account_register: {
    reply: `**Cách tạo tài khoản HK2 Travel:**\n\n1. Truy cập website → bấm **"Đăng ký"** góc trên phải\n2. Nhập email, mật khẩu (tối thiểu 8 ký tự)\n3. Xác nhận qua link gửi về email\n4. Đăng nhập và đặt tour!\n\nHoặc đăng nhập bằng **Google / Facebook** chỉ 1 click.\n\n*Tài khoản giúp bạn theo dõi đặt tour, yêu thích và nhận ưu đãi.*`,
    suggestions: ['Hướng dẫn đặt tour', 'Cách thanh toán online', 'Danh sách tất cả tour']
  },
  account_password: {
    reply: `**Quên hoặc đổi mật khẩu:**\n\n**Quên mật khẩu:**\n1. Trang đăng nhập → bấm **"Quên mật khẩu?"**\n2. Nhập email đăng ký → nhận link đặt lại mật khẩu\n3. Làm theo hướng dẫn trong email (có hiệu lực 30 phút)\n\n**Đổi mật khẩu:**\n1. Đăng nhập → vào **"Tài khoản của tôi"**\n2. Chọn **"Bảo mật"** → **"Đổi mật khẩu"**\n3. Nhập mật khẩu cũ và mới → Lưu\n\nNếu vẫn gặp vấn đề, liên hệ hotline để được hỗ trợ!`,
    suggestions: ['Liên hệ hỗ trợ', 'Hướng dẫn đặt tour', 'Danh sách tất cả tour']
  },
  booking_history: {
    reply: `**Xem lịch sử đặt tour:**\n\n1. Đăng nhập tài khoản\n2. Nhấn vào **tên của bạn** góc trên phải → chọn **"Đặt tour của tôi"**\n3. Xem danh sách tất cả booking: đang chờ, đã xác nhận, đã hoàn thành, đã hủy\n\nMỗi booking hiển thị đầy đủ: tên tour, ngày đi, số người, tổng tiền, trạng thái.`,
    suggestions: ['Chính sách hủy tour?', 'Hướng dẫn đặt tour', 'Liên hệ hỗ trợ']
  },
  insurance_info: {
    reply: `**Bảo hiểm du lịch tại HK2 Travel:**\n\n• Tất cả tour đều có **bảo hiểm tai nạn du lịch** cơ bản (theo quy định)\n• Mức bảo hiểm: đền bù tai nạn, y tế khẩn cấp trong hành trình\n• Khách có thể mua thêm **gói bảo hiểm nâng cao** (hỏi nhân viên khi đặt)\n\n**Lưu ý**: Mang theo CMND / CCCD khi đi tour để kích hoạt bảo hiểm nếu cần.\n\nMọi thắc mắc về bảo hiểm, liên hệ hotline để được giải thích chi tiết!`,
    suggestions: ['Chính sách hủy tour?', 'Hướng dẫn đặt tour', 'Liên hệ hỗ trợ']
  }
};

function buildRuleBasedReply(message, tours) {
  const lower = message.toLowerCase();
  const suggestions = DEFAULT_SUGGESTIONS;
  const intent = detectTourIntent(message);

  // ── Câu hỏi FAQ: trả lời ngay không cần tour ──
  if (intent.questionType && FAQ[intent.questionType]) {
    const faq = FAQ[intent.questionType];
    return { reply: faq.reply, tours: [], suggestions: faq.suggestions };
  }

  // ── Câu hỏi về công ty / hệ thống ──
  if (lower.includes('giới thiệu công ty') || lower.includes('gioi thieu cong ty') || lower.includes('giới thiệu hk2') || lower.includes('gioi thieu hk2') || lower.includes('dự án') || lower.includes('du an') || lower.includes('project') || (lower.includes('hk2') && (lower.includes('là gì') || lower.includes('la gi') || lower.includes('là ai') || lower.includes('la ai')))) {
    return {
      reply: 'HK2 Travel là hệ thống đặt tour du lịch trực tuyến, giúp bạn dễ dàng tìm kiếm, đặt tour và thanh toán ngay trên website. Hệ thống hỗ trợ: xem danh sách và chi tiết tour, đặt tour, thanh toán qua PayOS, xem lịch sử đặt tour, danh sách yêu thích, đánh giá tour, gửi liên hệ, đọc bài viết du lịch, chatbot AI tư vấn 24/7 và chat trực tiếp với nhân viên hỗ trợ.',
      tours: [],
      suggestions
    };
  }

  if (lower.includes('hệ thống') || lower.includes('website') || lower.includes('tính năng') || lower.includes('chức năng')) {
    return {
      reply: 'HK2 Travel hỗ trợ bạn: xem danh sách và chi tiết tour, tìm kiếm tour theo điểm đến, đăng ký/đăng nhập, đặt tour, thanh toán online qua PayOS, xem lịch sử đặt tour, wishlist, đánh giá sau chuyến đi, gửi liên hệ, đọc bài viết du lịch, chatbot AI tư vấn và chat trực tiếp với nhân viên hỗ trợ. Bạn cần hướng dẫn cụ thể về phần nào?',
      tours: [],
      suggestions
    };
  }

  // ── Hướng dẫn đặt tour ──
  if (intent.hasBookingGuide) {
    return {
      reply: '📌 **Hướng dẫn đặt tour tại HK2 Travel:**\n\n1️⃣ **Đăng nhập** vào tài khoản (hoặc đăng ký nếu chưa có)\n2️⃣ Vào trang **Danh sách tour**, chọn tour bạn thích\n3️⃣ Xem **chi tiết tour** (lịch trình, giá, ngày khởi hành, còn chỗ)\n4️⃣ Nhấn **"Đặt tour"**, chọn số lượng người và xác nhận\n5️⃣ Chuyển đến trang **thanh toán** → quét mã QR hoặc chuyển khoản qua PayOS\n6️⃣ Sau khi thanh toán, booking của bạn được **xác nhận tự động**\n7️⃣ Xem lại lịch sử đặt tour trong phần **Tài khoản của tôi**\n\nNếu cần hỗ trợ, bạn có thể chat trực tiếp với nhân viên hoặc gửi liên hệ!',
      tours: [],
      suggestions
    };
  }

  // ── Liệt kê tất cả tour ──
  if (lower.includes('liệt kê') || lower.includes('liet ke') || lower.includes('danh sách tour') || lower.includes('danh sach tour') || lower.includes('tất cả tour') || lower.includes('tat ca tour') || lower.includes('tour của công ty') || lower.includes('tour cua cong ty')) {
    if (tours.length === 0) {
      return { reply: 'Hiện mình chưa đọc được danh sách tour trong hệ thống.', tours: [], suggestions };
    }
    return {
      reply: `Hiện HK2 Travel đang có ${tours.length} tour. Mình hiển thị danh sách chi tiết ngay bên dưới để bạn xem nhanh.`,
      tours,
      suggestions
    };
  }

  if (tours.length === 0) {
    return {
      reply: 'Xin lỗi, mình chưa tìm thấy tour phù hợp. Bạn có thể thử tìm theo tên điểm đến khác hoặc hỏi "danh sách tour" để xem tất cả!',
      tours: [],
      suggestions
    };
  }

  // ── Câu hỏi so sánh / sắp xếp ──
  if (intent.questionType === 'cheapest' && tours.length > 0) {
    const best = tours[0];
    const price = Number(best.price).toLocaleString('vi-VN');
    let reply = `💰 Tour **giá rẻ nhất** hiện tại là:\n\n**${best.title}** (${best.destination})\n• Giá: **${price} VND**\n• Ngày đi: ${formatDate(best.startDate)} → ${formatDate(best.endDate)}\n• Còn ${best.availableSlots} chỗ trống`;
    if (TRANSPORT_LABEL[best.transport]) reply += `\n• Phương tiện: ${TRANSPORT_LABEL[best.transport]}`;
    if (tours.length > 1) {
      reply += '\n\n📋 Các tour giá tốt khác:';
      for (let i = 1; i < Math.min(tours.length, 3); i++) {
        const t = tours[i];
        reply += `\n• **${t.title}** (${t.destination}): ${Number(t.price).toLocaleString('vi-VN')} VND`;
      }
    }
    return { reply, tours, suggestions: getDynamicSuggestions('cheapest') };
  }

  if (intent.questionType === 'most_expensive' && tours.length > 0) {
    const best = tours[0];
    const price = Number(best.price).toLocaleString('vi-VN');
    let reply = `💎 Tour **cao cấp nhất** hiện tại là:\n\n**${best.title}** (${best.destination})\n• Giá: **${price} VND**\n• Ngày đi: ${formatDate(best.startDate)} → ${formatDate(best.endDate)}\n• Còn ${best.availableSlots} chỗ trống`;
    if (CATEGORY_LABEL[best.category]) reply += `\n• Loại: ${CATEGORY_LABEL[best.category]}`;
    return { reply, tours, suggestions: getDynamicSuggestions('most_expensive') };
  }

  if (intent.questionType === 'most_available' && tours.length > 0) {
    const best = tours[0];
    let reply = `👥 Tour **còn nhiều chỗ nhất** hiện tại là:\n\n**${best.title}** (${best.destination})\n• Còn **${best.availableSlots} chỗ** trống\n• Giá: ${Number(best.price).toLocaleString('vi-VN')} VND\n• Ngày đi: ${formatDate(best.startDate)} → ${formatDate(best.endDate)}`;
    return { reply, tours, suggestions: getDynamicSuggestions('most_available') };
  }

  if (intent.questionType === 'upcoming' && tours.length > 0) {
    const best = tours[0];
    let reply = `📅 Tour **sắp khởi hành gần nhất** là:\n\n**${best.title}** (${best.destination})\n• Ngày khởi hành: **${formatDate(best.startDate)}**\n• Ngày về: ${formatDate(best.endDate)}\n• Giá: ${Number(best.price).toLocaleString('vi-VN')} VND\n• Còn ${best.availableSlots} chỗ trống`;
    return { reply, tours, suggestions: getDynamicSuggestions('upcoming') };
  }

  if (intent.questionType === 'recommend' && tours.length > 0) {
    let reply = `🌟 Mình gợi ý một số tour phổ biến đang còn chỗ:\n`;
    for (const t of tours.slice(0, 3)) {
      reply += `\n• **${t.title}** (${t.destination}): ${Number(t.price).toLocaleString('vi-VN')} VND | 📅 ${formatDate(t.startDate)} | 👥 ${t.availableSlots} chỗ`;
    }
    reply += '\n\nBạn muốn tìm hiểu thêm về tour nào?';
    return { reply, tours, suggestions: getDynamicSuggestions('recommend') };
  }

  // ── 1 tour cụ thể ──
  if (tours.length === 1) {
    const t = tours[0];
    const price = Number(t.price).toLocaleString('vi-VN');
    const start = formatDate(t.startDate);
    const end = formatDate(t.endDate);
    const cat = CATEGORY_LABEL[t.category] || '';
    const transport = TRANSPORT_LABEL[t.transport] || '';

    const isHighlightQ = ['thú vị', 'thu vi', 'có gì', 'co gi', 'hoạt động', 'hoat dong', 'lịch trình', 'lich trinh', 'tham quan', 'điểm nổi bật', 'diem noi bat', 'khám phá', 'kham pha'].some(k => lower.includes(k));
    if (isHighlightQ && t.itinerary) {
      const lines = t.itinerary.split('\n').filter(Boolean).map(l => `• ${l.trim()}`).join('\n');
      return {
        reply: `**${t.title}** (${t.destination})${cat ? ` — ${cat}` : ''}\n\n📋 Lịch trình:\n${lines}\n\n💰 Giá: ${price} VND | 📅 ${start} → ${end} | 👥 Còn ${t.availableSlots} chỗ${transport ? ` | 🚌 ${transport}` : ''}\n\nXem chi tiết và đặt tour tại trang danh sách tour HK2 Travel!`,
        tours,
        suggestions
      };
    }

    if (lower.includes('giá') || lower.includes('bao nhiêu') || lower.includes('bao nhieu') || lower.includes('chi phí') || lower.includes('chi phi')) {
      return {
        reply: `Tour **${t.title}** (${t.destination}) có giá **${price} VND**.\n📅 Lịch trình: ${start} → ${end} | 👥 Còn ${t.availableSlots} chỗ trống.`,
        tours,
        suggestions
      };
    }

    return {
      reply: `**${t.title}** — ${t.destination}${cat ? ` (${cat})` : ''}\n💰 Giá: ${price} VND\n📅 ${start} → ${end}\n👥 Còn ${t.availableSlots} chỗ trống${transport ? `\n🚌 ${transport}` : ''}\n\nBạn có thể xem chi tiết và đặt tour ngay trên trang danh sách tour của HK2 Travel!`,
      tours,
      suggestions
    };
  }

  // ── Nhiều tour, không có context đặc biệt ──
  {
    const catLabel = intent.categoryFilter ? (CATEGORY_LABEL[intent.categoryFilter] || '') : '';
    const transLabel = intent.transportFilter ? (TRANSPORT_LABEL[intent.transportFilter] || '') : '';
    const monthLabel = intent.monthFilter ? `tháng ${(Array.isArray(intent.monthFilter) ? intent.monthFilter : [intent.monthFilter]).join('/')}` : '';
    const filterDesc = [catLabel, transLabel, monthLabel, intent.destFilter].filter(Boolean).join(', ');
    let reply = filterDesc
      ? `Mình tìm được **${tours.length} tour** ${filterDesc} phù hợp:\n`
      : `Mình tìm được **${tours.length} tour** phù hợp:\n`;
    for (const t of tours) {
      const cat = CATEGORY_LABEL[t.category] ? ` [${CATEGORY_LABEL[t.category]}]` : '';
      reply += `\n• **${t.title}**${cat} — ${t.destination}: ${Number(t.price).toLocaleString('vi-VN')} VND | 📅 ${formatDate(t.startDate)} | 👥 ${t.availableSlots} chỗ`;
    }
    reply += '\n\nBạn muốn biết thêm về tour nào?';
    return { reply, tours, suggestions: getDynamicSuggestions(intent.questionType) };
  }
}

module.exports = {
  ask: async (message, history = []) => {
    let tours = [];
    let systemSnapshot = { totalTours: 0, upcomingTours: 0, openSlots: 0, totalArticles: 0, totalUsers: 0, totalBookings: 0, totalReviews: 0, totalWishlists: 0, totalContacts: 0 };

    try {
      tours = await getRelevantTours(message);
    } catch (dbErr) {
      console.error('[AI] DB error (tours):', dbErr.message);
    }
    try {
      systemSnapshot = await getSystemSnapshot();
    } catch (dbErr) {
      console.error('[AI] DB error (snapshot):', dbErr.message);
    }

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
