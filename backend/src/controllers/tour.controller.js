const pool = require('../config/db');

function safeParseJson(value, defaultVal = []) {
  if (Array.isArray(value)) return value;
  if (!value) return defaultVal;
  try {
    const p = JSON.parse(value);
    return Array.isArray(p) ? p : defaultVal;
  } catch { return defaultVal; }
}

function formatTour(t) {
  return { ...t, image_urls: safeParseJson(t.image_urls, t.image_url ? [t.image_url] : []) };
}

exports.getAllTours = async (req, res) => {
  const { title, destination, minPrice, maxPrice, category, status, transport } = req.query;
  let query = 'SELECT * FROM tours WHERE 1=1';
  const params = [];

  if (title) { query += ' AND title LIKE ?'; params.push(`%${title}%`); }
  if (destination) { query += ' AND destination LIKE ?'; params.push(`%${destination}%`); }
  if (minPrice) { query += ' AND price >= ?'; params.push(Number(minPrice)); }
  if (maxPrice) { query += ' AND price <= ?'; params.push(Number(maxPrice)); }
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (transport) { query += ' AND transport = ?'; params.push(transport); }

  query += ' ORDER BY created_at DESC';
  const [rows] = await pool.execute(query, params);
  res.json(rows.map(formatTour));
};

exports.getFeaturedTours = async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT t.*, COUNT(b.id) as booking_count
    FROM tours t
    LEFT JOIN bookings b ON b.tour_id = t.id AND b.booking_status != 'cancelled'
    WHERE t.slots > 0
    GROUP BY t.id
    ORDER BY booking_count DESC
    LIMIT 6
  `);
  res.json(rows.map(formatTour));
};

exports.getTourById = async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute('SELECT * FROM tours WHERE id = ? LIMIT 1', [id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy tour' });

  const tour = formatTour(rows[0]);
  const [reviews] = await pool.execute(`
    SELECT r.*, u.full_name as user_name
    FROM reviews r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.tour_id = ? AND r.status = 'approved'
    ORDER BY r.created_at DESC
  `, [id]);

  tour.reviews = reviews;
  res.json(tour);
};

exports.createTour = async (req, res) => {
  const { title, destination, departurePoint, category, status, transport, itinerary, price, startDate, endDate, slots, imageUrls, latitude, longitude } = req.body;

  if (!title || !destination || price == null || !slots) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
  }

  const imageUrlMain = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : null;
  const imageUrlsJson = Array.isArray(imageUrls) && imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;

  const [result] = await pool.execute(
    'INSERT INTO tours (title, destination, departure_point, category, status, transport, itinerary, price, start_date, end_date, slots, image_url, image_urls, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title, destination, departurePoint || null, category || null, status || 'open', transport || null, itinerary || null, Number(price), startDate || null, endDate || null, Number(slots), imageUrlMain, imageUrlsJson, latitude || null, longitude || null]
  );

  res.status(201).json({ id: result.insertId, message: 'Tạo tour thành công' });

  // Log
  pool.execute('INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)',
    [req.user.id, req.user.role, 'Tạo tour', `Tạo tour "${title}" (ID: ${result.insertId})`]).catch(() => {});
};

exports.updateTour = async (req, res) => {
  const { id } = req.params;
  const { title, destination, departurePoint, category, status, transport, itinerary, price, startDate, endDate, slots, imageUrls, latitude, longitude } = req.body;

  const [existing] = await pool.execute('SELECT id FROM tours WHERE id = ? LIMIT 1', [id]);
  if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy tour' });

  const imageUrlMain = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : undefined;
  const imageUrlsJson = Array.isArray(imageUrls) && imageUrls.length > 0 ? JSON.stringify(imageUrls) : undefined;

  // Build dynamic update - only update provided fields
  const fields = [];
  const params = [];
  if (title !== undefined) { fields.push('title = ?'); params.push(title); }
  if (destination !== undefined) { fields.push('destination = ?'); params.push(destination); }
  if (departurePoint !== undefined) { fields.push('departure_point = ?'); params.push(departurePoint || null); }
  if (category !== undefined) { fields.push('category = ?'); params.push(category || null); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status || 'open'); }
  if (transport !== undefined) { fields.push('transport = ?'); params.push(transport || null); }
  if (itinerary !== undefined) { fields.push('itinerary = ?'); params.push(itinerary || null); }
  if (price !== undefined) { fields.push('price = ?'); params.push(Number(price)); }
  if (startDate !== undefined) { fields.push('start_date = ?'); params.push(startDate || null); }
  if (endDate !== undefined) { fields.push('end_date = ?'); params.push(endDate || null); }
  if (slots !== undefined) { fields.push('slots = ?'); params.push(Number(slots)); }
  if (imageUrlMain !== undefined) { fields.push('image_url = ?'); params.push(imageUrlMain); }
  if (imageUrlsJson !== undefined) { fields.push('image_urls = ?'); params.push(imageUrlsJson); }
  if (latitude !== undefined) { fields.push('latitude = ?'); params.push(latitude || null); }
  if (longitude !== undefined) { fields.push('longitude = ?'); params.push(longitude || null); }

  if (fields.length === 0) return res.status(400).json({ message: 'Không có thông tin để cập nhật' });

  fields.push('updated_at = NOW()');
  params.push(id);

  await pool.execute(`UPDATE tours SET ${fields.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Cập nhật tour thành công' });

  // Log
  pool.execute('INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)',
    [req.user.id, req.user.role, 'Sửa tour', `Cập nhật tour ID: ${id}`]).catch(() => {});
};

exports.deleteTour = async (req, res) => {
  const { id } = req.params;
  const [existing] = await pool.execute('SELECT id FROM tours WHERE id = ? LIMIT 1', [id]);
  if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy tour' });
  await pool.execute('DELETE FROM tours WHERE id = ?', [id]);
  res.json({ message: 'Xóa tour thành công' });

  // Log
  pool.execute('INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)',
    [req.user.id, req.user.role, 'Xóa tour', `Xóa tour ID: ${id}`]).catch(() => {});
};
