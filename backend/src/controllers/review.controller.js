const pool = require('../config/db');

const createReview = async (req, res) => {
  try {
    const { tourId, rating, comment } = req.body;
    const parsedRating = Number(rating);

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Đánh giá sao phải từ 1 đến 5 sao.' });
    }

    const [bookingRows] = await pool.query(
      `SELECT id FROM bookings
       WHERE user_id = ? AND tour_id = ? AND booking_status IN ('confirmed', 'completed')`,
      [req.user.id, tourId]
    );

    if (!bookingRows.length) {
      return res.status(400).json({ message: 'Bạn chỉ có thể đánh giá những tour đã đặt.' });
    }

    await pool.query(
      'INSERT INTO reviews (user_id, tour_id, rating, comment, status) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, tourId, parsedRating, String(comment || '').trim(), 'visible']
    );

    return res.status(201).json({ message: 'Gửi đánh giá thành công.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getReviewsByTour = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.status, r.created_at,
              r.staff_reply, r.staff_reply_at,
              u.full_name,
              ru.full_name AS reply_staff_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN users ru ON ru.id = r.staff_reply_by
       WHERE r.tour_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.tourId]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllReviewsForAdmin = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, u.full_name, t.title, ru.full_name AS reply_staff_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       JOIN tours t ON t.id = r.tour_id
       LEFT JOIN users ru ON ru.id = r.staff_reply_by
       ORDER BY r.created_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllReviewsForStaff = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, u.full_name, t.title, ru.full_name AS reply_staff_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       JOIN tours t ON t.id = r.tour_id
       LEFT JOIN users ru ON ru.id = r.staff_reply_by
       ORDER BY r.created_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE reviews SET status = ? WHERE id = ?', [status, req.params.id]);
    return res.json({ message: 'Đã cập nhật trạng thái đánh giá.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const replyToReview = async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const reply = String(req.body?.reply || '').trim();

    if (!reply) {
      return res.status(400).json({ message: 'Nội dung phản hồi không được để trống.' });
    }

    const [result] = await pool.query(
      `UPDATE reviews
       SET staff_reply = ?,
           staff_reply_by = ?,
           staff_reply_at = NOW()
       WHERE id = ?`,
      [reply, req.user.id, reviewId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá.' });
    }

    return res.json({ message: 'Đã phản hồi đánh giá của khách hàng.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReview,
  getReviewsByTour,
  getAllReviewsForAdmin,
  getAllReviewsForStaff,
  updateReviewStatus,
  replyToReview
};
