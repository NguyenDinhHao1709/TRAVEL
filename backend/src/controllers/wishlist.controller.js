const pool = require('../config/db');

const addToWishlist = async (req, res) => {
  try {
    const { tourId } = req.body;
    await pool.query('INSERT IGNORE INTO wishlists (user_id, tour_id) VALUES (?, ?)', [req.user.id, tourId]);
    return res.status(201).json({ message: 'Added to wishlist' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyWishlist = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.id, t.id AS tour_id, t.title, t.destination, t.price
       FROM wishlists w
       JOIN tours t ON t.id = w.tour_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    await pool.query('DELETE FROM wishlists WHERE user_id = ? AND tour_id = ?', [req.user.id, req.params.tourId]);
    return res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { addToWishlist, getMyWishlist, removeFromWishlist };
