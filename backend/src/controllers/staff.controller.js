const pool = require('../config/db');

const getCustomers = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, full_name, email, created_at FROM users WHERE role = 'user' AND COALESCE(is_deleted, 0) = 0 ORDER BY created_at DESC");
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCustomerBookingHistory = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, t.title
       FROM bookings b
       JOIN tours t ON t.id = b.tour_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.params.customerId]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getCustomers, getCustomerBookingHistory };
