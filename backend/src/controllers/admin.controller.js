const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { sendResetPasswordEmail } = require('../services/email.service');

const generateTempPassword = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
};

const writeSystemLog = async (action, actorRole = 'admin') => {
  try {
    await pool.query('INSERT INTO system_logs (action, actor_role) VALUES (?, ?)', [action, actorRole]);
  } catch {}
};

const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, role, created_at,
              COALESCE(is_locked, 0) AS is_locked,
              COALESCE(is_deleted, 0) AS is_deleted,
              deleted_at
       FROM users
       ORDER BY created_at DESC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
      [fullName, email, hashedPassword, role]
    );
    return res.status(201).json({ id: result.insertId, message: 'User created' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { fullName, role } = req.body;
    await pool.query('UPDATE users SET full_name = ?, role = ? WHERE id = ?', [fullName, role, req.params.id]);
    return res.json({ message: 'User updated' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getUserDetail = async (req, res) => {
  try {
    const userId = req.params.id;

    const [[user]] = await pool.query(
      `SELECT id, full_name, email, role, created_at,
              COALESCE(is_locked, 0) AS is_locked,
              COALESCE(is_deleted, 0) AS is_deleted,
              deleted_at
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const [bookings] = await pool.query(
      `SELECT b.id, b.created_at, b.departure_date, b.people_count, b.total_amount, b.booking_status, b.payment_status,
              t.title AS tour_title
       FROM bookings b
       LEFT JOIN tours t ON t.id = b.tour_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC
       LIMIT 200`,
      [userId]
    );

    const [payments] = await pool.query(
      `SELECT p.id, p.created_at, p.amount, p.method, p.transaction_code, p.status, p.booking_id
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE b.user_id = ?
       ORDER BY p.created_at DESC
       LIMIT 200`,
      [userId]
    );

    const [reviews] = await pool.query(
      `SELECT r.id, r.created_at, r.rating, r.comment, r.status,
              t.title AS tour_title
       FROM reviews r
       LEFT JOIN tours t ON t.id = r.tour_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT 200`,
      [userId]
    );

    return res.json({ user, bookings, payments, reviews });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const lockUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (userId === Number(req.user.id)) {
      return res.status(400).json({ message: 'Không thể khóa chính tài khoản admin hiện tại' });
    }

    const [result] = await pool.query(
      `UPDATE users
       SET is_locked = 1
       WHERE id = ? AND COALESCE(is_deleted, 0) = 0`,
      [userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng hoặc tài khoản đã bị xóa' });
    }

    await writeSystemLog(`Khóa tài khoản user #${userId}`, req.user.role);
    return res.json({ message: 'Đã khóa tài khoản người dùng' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const unlockUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    const [result] = await pool.query(
      `UPDATE users
       SET is_locked = 0
       WHERE id = ? AND COALESCE(is_deleted, 0) = 0`,
      [userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng hoặc tài khoản đã bị xóa' });
    }

    await writeSystemLog(`Mở khóa tài khoản user #${userId}`, req.user.role);
    return res.json({ message: 'Đã mở khóa tài khoản người dùng' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { sendEmail = false } = req.body || {};

    const [rows] = await pool.query('SELECT id, email, full_name FROM users WHERE id = ? AND COALESCE(is_deleted, 0) = 0', [userId]);

    if (!rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng hoặc tài khoản đã bị xóa' });
    }

    const generatedPassword = generateTempPassword(12);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    await pool.query('UPDATE users SET password = ?, must_change_password = 1 WHERE id = ?', [hashedPassword, userId]);

    if (sendEmail) {
      setImmediate(async () => {
        try {
          await sendResetPasswordEmail({
            toEmail: rows[0].email,
            fullName: rows[0].full_name,
            tempPassword: generatedPassword
          });
        } catch (error) {
          console.error('Send reset password email failed:', error.message);
          await writeSystemLog(`Gửi email reset mật khẩu thất bại user #${userId}`, req.user.role);
        }
      });
    }

    await writeSystemLog(`Reset mật khẩu user #${userId}`, req.user.role);

    return res.json({
      message: sendEmail
        ? 'Đã reset mật khẩu thành công, email đang được gửi'
        : 'Đã reset mật khẩu thành công',
      email: rows[0].email
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (userId === Number(req.user.id)) {
      return res.status(400).json({ message: 'Không thể xóa chính tài khoản admin hiện tại' });
    }

    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    await writeSystemLog(`Xóa vĩnh viễn user #${userId}`, req.user.role);
    return res.json({ message: 'Đã xóa vĩnh viễn người dùng' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createArticle = async (req, res) => {
  try {
    const { title, content } = req.body;
    const [result] = await pool.query('INSERT INTO articles (title, content) VALUES (?, ?)', [title, content]);
    return res.status(201).json({ id: result.insertId, message: 'Article created' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getArticles = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM articles ORDER BY created_at DESC');
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createBanner = async (req, res) => {
  try {
    const { title, imageUrl } = req.body;
    const [result] = await pool.query('INSERT INTO banners (title, image_url) VALUES (?, ?)', [title, imageUrl]);
    return res.status(201).json({ id: result.insertId, message: 'Banner created' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getBanners = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM banners ORDER BY created_at DESC');
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDashboard = async (req, res) => {
  try {
    const [[revenue]] = await pool.query("SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM bookings WHERE payment_status = 'paid'");
    const [[bookingCount]] = await pool.query('SELECT COUNT(*) AS totalBookings FROM bookings');
    const [[userCount]] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users WHERE role = 'user' AND COALESCE(is_deleted, 0) = 0");
    const [[tourCount]] = await pool.query('SELECT COUNT(*) AS totalTours FROM tours');

    return res.json({
      revenue: revenue.revenue,
      totalBookings: bookingCount.totalBookings,
      totalUsers: userCount.totalUsers,
      totalTours: tourCount.totalTours
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getSystemLogs = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 200');
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getBookingReport = async (req, res) => {
  try {
    const { groupBy = 'day', day = '', month = '', year = '' } = req.query;

    const normalizedGroupBy = ['day', 'month', 'year'].includes(groupBy) ? groupBy : 'day';
    const formatByGroup = {
      day: '%Y-%m-%d',
      month: '%Y-%m',
      year: '%Y'
    };
    const groupFormat = formatByGroup[normalizedGroupBy];

    const today = new Date();
    let whereClause = '';
    let whereParams = [];
    let selectedLabel = '';

    if (normalizedGroupBy === 'day') {
      const selectedDay = day || today.toISOString().slice(0, 10);
      whereClause = 'DATE(created_at) = ?';
      whereParams = [selectedDay];
      selectedLabel = selectedDay;
    }

    if (normalizedGroupBy === 'month') {
      const selectedMonth = month || today.toISOString().slice(0, 7);
      whereClause = "DATE_FORMAT(created_at, '%Y-%m') = ?";
      whereParams = [selectedMonth];
      selectedLabel = selectedMonth;
    }

    if (normalizedGroupBy === 'year') {
      const selectedYear = year || String(today.getFullYear());
      whereClause = "DATE_FORMAT(created_at, '%Y') = ?";
      whereParams = [selectedYear];
      selectedLabel = selectedYear;
    }

    const [summaryRows] = await pool.query(
      `SELECT
         COUNT(*) AS totalBooked,
         SUM(CASE WHEN booking_status IN ('confirmed', 'completed') THEN 1 ELSE 0 END) AS totalSuccess,
         SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) AS totalCancelled,
         COALESCE(SUM(CASE WHEN payment_status = 'paid' AND booking_status <> 'cancelled' THEN total_amount ELSE 0 END), 0) AS totalRevenue
       FROM bookings
       WHERE ${whereClause}`,
      whereParams
    );

    const [seriesRows] = await pool.query(
      `SELECT
         DATE_FORMAT(created_at, ?) AS period,
         COUNT(*) AS totalBooked,
         SUM(CASE WHEN booking_status IN ('confirmed', 'completed') THEN 1 ELSE 0 END) AS successCount,
         SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledCount,
         COALESCE(SUM(CASE WHEN payment_status = 'paid' AND booking_status <> 'cancelled' THEN total_amount ELSE 0 END), 0) AS revenue
       FROM bookings
       WHERE ${whereClause}
       GROUP BY DATE_FORMAT(created_at, ?)
       ORDER BY DATE_FORMAT(created_at, ?) ASC`,
      [groupFormat, ...whereParams, groupFormat, groupFormat]
    );

    const summary = summaryRows[0] || {
      totalBooked: 0,
      totalSuccess: 0,
      totalCancelled: 0,
      totalRevenue: 0
    };

    return res.json({
      groupBy: normalizedGroupBy,
      selected: selectedLabel,
      summary: {
        totalBooked: Number(summary.totalBooked || 0),
        totalSuccess: Number(summary.totalSuccess || 0),
        totalCancelled: Number(summary.totalCancelled || 0),
        totalRevenue: Number(summary.totalRevenue || 0)
      },
      series: seriesRows.map((row) => ({
        period: row.period,
        totalBooked: Number(row.totalBooked || 0),
        successCount: Number(row.successCount || 0),
        cancelledCount: Number(row.cancelledCount || 0),
        revenue: Number(row.revenue || 0)
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  getUserDetail,
  lockUser,
  unlockUser,
  resetUserPassword,
  deleteUser,
  createArticle,
  getArticles,
  createBanner,
  getBanners,
  getDashboard,
  getSystemLogs,
  getBookingReport
};
