const pool = require('../config/db');

exports.getAllReviews = async (req, res) => {
  const { tourId } = req.query;
  if (!tourId) return res.json([]);

  const [rows] = await pool.execute(`
    SELECT r.*, u.full_name as user_name
    FROM reviews r LEFT JOIN users u ON u.id = r.user_id
    WHERE r.tour_id = ? AND r.status = 'approved'
    ORDER BY r.created_at DESC
  `, [tourId]);
  res.json(rows);
};

exports.getAdminAllReviews = async (req, res) => {
  const { page = 1, limit = 10, search, status, rating } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = 'WHERE 1=1';
  const params = [];

  if (search) { where += ' AND (r.comment LIKE ? OR u.full_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (status) { where += ' AND r.status = ?'; params.push(status); }
  if (rating) { where += ' AND r.rating = ?'; params.push(Number(rating)); }

  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) as total FROM reviews r LEFT JOIN users u ON u.id = r.user_id ${where}`, params);
  const [rows] = await pool.execute(
    `SELECT r.*, u.full_name as user_name, t.title as tour_title FROM reviews r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN tours t ON t.id = r.tour_id ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

  res.json({ data: rows, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
};

exports.getStaffAllReviews = async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT r.*, u.full_name as user_name, t.title as tour_title
    FROM reviews r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN tours t ON t.id = r.tour_id
    WHERE r.status = 'approved'
    ORDER BY r.created_at DESC LIMIT 100
  `);
  res.json(rows);
};

exports.getReviewById = async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM reviews WHERE id = ? LIMIT 1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
  res.json(rows[0]);
};

exports.createReview = async (req, res) => {
  const userId = req.user.id;
  const { tourId, rating, comment } = req.body;

  if (!tourId || !rating) {
    return res.status(400).json({ message: 'Vui lòng nhập tour và điểm đánh giá' });
  }

  const ratingNum = Number(rating);
  if (ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ message: 'Điểm đánh giá phải từ 1 đến 5' });
  }

  // Kiểm tra đã đặt tour thành công chưa
  const [booking] = await pool.execute(
    "SELECT id FROM bookings WHERE user_id = ? AND tour_id = ? AND (booking_status IN ('confirmed', 'completed') OR payment_status = 'paid') LIMIT 1",
    [userId, tourId]
  );
  if (booking.length === 0) {
    return res.status(403).json({ message: 'Bạn cần đặt tour thành công trước khi đánh giá' });
  }

  // Kiểm tra đã có đánh giá chưa
  const [dup] = await pool.execute(
    'SELECT id FROM reviews WHERE user_id = ? AND tour_id = ? LIMIT 1',
    [userId, tourId]
  );
  if (dup.length > 0) {
    return res.status(400).json({ message: 'Bạn đã đánh giá tour này rồi' });
  }

  await pool.execute(
    "INSERT INTO reviews (user_id, tour_id, rating, comment, status) VALUES (?, ?, ?, ?, 'approved')",
    [userId, tourId, ratingNum, comment || null]
  );

  res.status(201).json({ message: 'Gửi đánh giá thành công' });
};

exports.getMyReview = async (req, res) => {
  const userId = req.user.id;
  const { tourId } = req.params;
  const [rows] = await pool.execute(
    'SELECT * FROM reviews WHERE user_id = ? AND tour_id = ? LIMIT 1',
    [userId, tourId]
  );
  res.json(rows.length > 0 ? rows[0] : null);
};

exports.deleteOwnReview = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const [existing] = await pool.execute('SELECT id, user_id FROM reviews WHERE id = ? LIMIT 1', [id]);
  if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
  if (existing[0].user_id !== userId) return res.status(403).json({ message: 'Bạn không có quyền xóa đánh giá này' });

  await pool.execute('DELETE FROM reviews WHERE id = ?', [id]);
  res.json({ message: 'Đã xóa đánh giá' });
};

exports.staffReplyReview = async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply || !String(reply).trim()) {
    return res.status(400).json({ message: 'Nội dung phản hồi không được để trống' });
  }

  const [existing] = await pool.execute('SELECT id FROM reviews WHERE id = ? LIMIT 1', [id]);
  if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy đánh giá' });

  const staffName = req.user?.fullName || req.user?.full_name || 'Nhân viên';
  await pool.execute(
    'UPDATE reviews SET staff_reply = ?, reply_staff_name = ?, staff_reply_at = NOW(), updated_at = NOW() WHERE id = ?',
    [String(reply).trim(), staffName, id]
  );
  res.json({ message: 'Đã phản hồi đánh giá' });
};

exports.customerReplyReview = async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;
  const userId = req.user.id;

  if (!reply || !String(reply).trim()) {
    return res.status(400).json({ message: 'Nội dung trả lời không được để trống' });
  }

  const [existing] = await pool.execute('SELECT id, user_id, staff_reply FROM reviews WHERE id = ? LIMIT 1', [id]);
  if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
  if (existing[0].user_id !== userId) return res.status(403).json({ message: 'Bạn không có quyền trả lời đánh giá này' });
  if (!existing[0].staff_reply) return res.status(400).json({ message: 'Nhân viên chưa phản hồi đánh giá này' });

  await pool.execute(
    'UPDATE reviews SET customer_reply = ?, customer_reply_at = NOW(), updated_at = NOW() WHERE id = ?',
    [String(reply).trim(), id]
  );
  res.json({ message: 'Đã gửi trả lời' });
};

exports.updateReview = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  await pool.execute('UPDATE reviews SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
  res.json({ message: 'Cập nhật đánh giá thành công' });
};

exports.deleteReview = async (req, res) => {
  await pool.execute('DELETE FROM reviews WHERE id = ?', [req.params.id]);
  res.json({ message: 'Xóa đánh giá thành công' });
};
