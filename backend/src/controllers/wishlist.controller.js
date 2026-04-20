const pool = require('../config/db');

exports.getMyWishlist = async (req, res) => {
  const userId = req.user.id;
  const [rows] = await pool.execute(`
    SELECT w.id, w.tour_id, t.title, t.destination, t.price, t.image_url, t.slots,
           t.start_date, t.end_date, t.departure_point, t.transport, t.category
    FROM wishlists w JOIN tours t ON t.id = w.tour_id
    WHERE w.user_id = ?
    ORDER BY w.created_at DESC
  `, [userId]);
  res.json(rows);
};

exports.addToWishlist = async (req, res) => {
  const userId = req.user.id;
  const { tourId } = req.body;

  if (!tourId) return res.status(400).json({ message: 'Thiếu tourId' });

  const [tourExists] = await pool.execute('SELECT id FROM tours WHERE id = ? LIMIT 1', [tourId]);
  if (tourExists.length === 0) return res.status(404).json({ message: 'Không tìm thấy tour' });

  try {
    await pool.execute(
      'INSERT INTO wishlists (user_id, tour_id) VALUES (?, ?)',
      [userId, Number(tourId)]
    );
    res.status(201).json({ message: 'Đã thêm vào yêu thích' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Tour đã có trong danh sách yêu thích' });
    }
    throw err;
  }
};

exports.removeFromWishlistByTourId = async (req, res) => {
  const userId = req.user.id;
  const { tourId } = req.params;
  await pool.execute('DELETE FROM wishlists WHERE user_id = ? AND tour_id = ?', [userId, tourId]);
  res.json({ message: 'Đã xóa khỏi yêu thích' });
};

exports.getAllWishlists = async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM wishlists ORDER BY created_at DESC');
  res.json(rows);
};

exports.removeFromWishlist = async (req, res) => {
  await pool.execute('DELETE FROM wishlists WHERE id = ?', [req.params.id]);
  res.json({ message: 'Đã xóa khỏi yêu thích' });
};
