const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/email.service');

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  const [[{ totalUsers }]] = await pool.execute("SELECT COUNT(*) as totalUsers FROM users WHERE role = 'user'");
  const [[{ totalTours }]] = await pool.execute('SELECT COUNT(*) as totalTours FROM tours');
  const [[{ totalBookings }]] = await pool.execute("SELECT COUNT(*) as totalBookings FROM bookings WHERE booking_status != 'cancelled'");
  const [[{ totalRevenue }]] = await pool.execute("SELECT COALESCE(SUM(total_amount), 0) as totalRevenue FROM bookings WHERE payment_status = 'paid'");
  const [[{ unreadContacts }]] = await pool.execute('SELECT COUNT(*) as unreadContacts FROM contact_messages WHERE is_read = 0');

  res.json({ totalUsers, totalTours, totalBookings, totalRevenue, unreadContacts });
};

// Users list (paginated)
exports.getUsers = async (req, res) => {
  const { page = 1, limit = 10, search, role, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = "WHERE role != 'admin'";
  const params = [];

  if (search) { where += ' AND (full_name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (role) { where += ' AND role = ?'; params.push(role); }
  if (status === 'locked') { where += ' AND is_locked = 1'; }
  else if (status === 'active') { where += ' AND is_locked = 0'; }

  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) as total FROM users ${where}`, params);
  const [data] = await pool.execute(
    `SELECT id, full_name, email, role, phone, is_locked, must_change_password, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

  res.json({ data, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
};

// User detail + bookings
exports.getUserDetail = async (req, res) => {
  try {
  const { userId } = req.params;
  const [userRows] = await pool.execute(
    'SELECT id, full_name, email, role, phone, is_locked, is_deleted, created_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  if (userRows.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

  const user = userRows[0];

  const [bookings] = await pool.execute(`
    SELECT b.*, t.title as tour_title
    FROM bookings b LEFT JOIN tours t ON t.id = b.tour_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC LIMIT 20
  `, [userId]);

  // Derive payments from paid bookings (no separate payments table)
  const payments = bookings
    .filter(b => b.payment_status && b.payment_status !== 'unpaid')
    .map(b => ({
      id: b.id,
      booking_id: b.id,
      method: b.payment_method || 'vnpay',
      amount: b.total_amount,
      status: b.payment_status,
      created_at: b.updated_at || b.created_at
    }));

  const [reviews] = await pool.execute(`
    SELECT r.*, t.title as tour_title
    FROM reviews r LEFT JOIN tours t ON t.id = r.tour_id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC LIMIT 20
  `, [userId]);

  // Nếu là nhân viên: lấy thêm các booking mà họ đã xử lý
  let handledBookings = [];
  if (user.role === 'staff' || user.role === 'admin') {
    const [handled] = await pool.execute(`
      SELECT b.*, t.title as tour_title, u.full_name as customer_name, u.email as customer_email
      FROM bookings b
      LEFT JOIN tours t ON t.id = b.tour_id
      LEFT JOIN users u ON u.id = b.user_id
      WHERE b.confirmed_by_staff_id = ?
      ORDER BY b.updated_at DESC LIMIT 50
    `, [userId]);
    handledBookings = handled;
  }

  res.json({ user, bookings, payments, reviews, handledBookings });
  } catch (err) {
    console.error('[Admin] getUserDetail error:', err);
    res.status(500).json({ message: 'Không thể tải chi tiết người dùng' });
  }
};

// Lock user
exports.lockUser = async (req, res) => {
  try {
  const { userId } = req.params;
  const [existing] = await pool.execute("SELECT id, role FROM users WHERE id = ? LIMIT 1", [userId]);
  if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
  if (existing[0].role === 'admin') return res.status(400).json({ message: 'Không thể khóa tài khoản admin' });

  await pool.execute('UPDATE users SET is_locked = 1, updated_at = NOW() WHERE id = ?', [userId]);
  pool.execute('INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)', [
    req.user.id, req.user.role, 'Khóa tài khoản', `Khóa tài khoản user ID ${userId}`
  ]).catch(() => {});
  res.json({ message: 'Đã khóa tài khoản' });
  } catch (err) {
    console.error('[Admin] lockUser error:', err);
    res.status(500).json({ message: 'Không thể khóa tài khoản' });
  }
};

// Unlock user
exports.unlockUser = async (req, res) => {
  try {
  const { userId } = req.params;
  await pool.execute('UPDATE users SET is_locked = 0, updated_at = NOW() WHERE id = ?', [userId]);
  pool.execute('INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)', [
    req.user.id, req.user.role, 'Mở khóa tài khoản', `Mở khóa tài khoản user ID ${userId}`
  ]).catch(() => {});
  res.json({ message: 'Đã mở khóa tài khoản' });
  } catch (err) {
    console.error('[Admin] unlockUser error:', err);
    res.status(500).json({ message: 'Không thể mở khóa tài khoản' });
  }
};

// Hard delete user
exports.deleteUser = async (req, res) => {
  try {
  const { userId } = req.params;
  const [existing] = await pool.execute("SELECT id, role FROM users WHERE id = ? LIMIT 1", [userId]);
  if (existing.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
  if (existing[0].role === 'admin') return res.status(400).json({ message: 'Không thể xóa tài khoản admin' });

  await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
  pool.execute('INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)', [
    req.user.id, req.user.role, 'Xóa tài khoản', `Xóa vĩnh viễn user ID ${userId}`
  ]).catch(() => {});
  res.json({ message: 'Đã xóa tài khoản' });
  } catch (err) {
    console.error('[Admin] deleteUser error:', err);
    res.status(500).json({ message: 'Không thể xóa tài khoản' });
  }
};

// Reset user password
exports.resetUserPassword = async (req, res) => {
  try {
  const { userId } = req.params;
  const { sendEmail: shouldSendEmail } = req.body;

  const [userRows] = await pool.execute('SELECT id, email, full_name FROM users WHERE id = ? LIMIT 1', [userId]);
  if (userRows.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

  const user = userRows[0];
  const tempPassword = crypto.randomBytes(6).toString('hex');
  const hash = await bcrypt.hash(tempPassword, 10);

  await pool.execute('UPDATE users SET password = ?, must_change_password = 1, updated_at = NOW() WHERE id = ?', [hash, userId]);

  let emailSent = false;
  if (shouldSendEmail) {
    try {
      await emailService.sendMail(
        user.email,
        'Mật khẩu tạm thời - HK2 Travel',
        `<p>Xin chào <strong>${user.full_name}</strong>,</p>
         <p>Mật khẩu của bạn đã được đặt lại. Mật khẩu tạm thời: <strong style="font-size:18px">${tempPassword}</strong></p>
         <p>Vui lòng đổi mật khẩu ngay sau khi đăng nhập.</p>`
      );
      emailSent = true;
    } catch (e) {
      console.error('[Admin] Reset password email error:', e.message);
    }
  }

  const msg = emailSent
    ? `Đã reset mật khẩu và gửi mật khẩu tạm về ${user.email}`
    : `Đã reset mật khẩu. Mật khẩu tạm: ${tempPassword}`;

  res.json({ message: msg, tempPassword: shouldSendEmail ? undefined : tempPassword });
  } catch (err) {
    console.error('[Admin] resetUserPassword error:', err);
    res.status(500).json({ message: 'Không thể reset mật khẩu' });
  }
};

// Activity logs
exports.getLogs = async (req, res) => {
  const { page = 1, limit = 10, search, role, action } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = 'WHERE 1=1';
  const params = [];

  if (search) { where += ' AND (l.action LIKE ? OR l.details LIKE ? OR u.full_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (role) { where += ' AND l.role = ?'; params.push(role); }
  if (action) { where += ' AND l.action LIKE ?'; params.push(`%${action}%`); }

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) as total FROM activity_logs l LEFT JOIN users u ON u.id = l.user_id ${where}`, params
  );
  const [data] = await pool.execute(
    `SELECT l.*, u.full_name as user_name FROM activity_logs l LEFT JOIN users u ON u.id = l.user_id ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

  res.json({ data, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
};

// Bookings report
exports.getBookingsReport = async (req, res) => {
  const { groupBy = 'day', day, month, year } = req.query;

  let selectExpr, whereClause = '';
  const params = [];
  let selected = null;

  if (groupBy === 'day') {
    selectExpr = "DATE_FORMAT(created_at, '%d/%m/%Y') as period";
    if (day) { whereClause = 'WHERE DATE(created_at) = ?'; params.push(day); selected = day; }
    else { whereClause = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'; }
  } else if (groupBy === 'month') {
    selectExpr = "DATE_FORMAT(created_at, '%m/%Y') as period";
    if (month) { whereClause = "WHERE DATE_FORMAT(created_at, '%Y-%m') = ?"; params.push(month); selected = month; }
    else { whereClause = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)'; }
  } else {
    selectExpr = "YEAR(created_at) as period";
    const targetYear = year || new Date().getFullYear();
    whereClause = 'WHERE YEAR(created_at) = ?';
    params.push(targetYear);
    selected = String(targetYear);
  }

  const [rows] = await pool.execute(`
    SELECT ${selectExpr},
      COUNT(*) as totalBooked,
      SUM(CASE WHEN booking_status NOT IN ('cancelled') THEN 1 ELSE 0 END) as successCount,
      SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelledCount,
      SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as revenue
    FROM bookings
    ${whereClause}
    GROUP BY period
    ORDER BY period ASC
  `, params);

  const summary = {
    totalBooked: rows.reduce((s, r) => s + Number(r.totalBooked || 0), 0),
    totalSuccess: rows.reduce((s, r) => s + Number(r.successCount || 0), 0),
    totalCancelled: rows.reduce((s, r) => s + Number(r.cancelledCount || 0), 0),
    totalRevenue: rows.reduce((s, r) => s + Number(r.revenue || 0), 0)
  };

  res.json({ summary, series: rows, groupBy, selected });
};
