const pool = require('../config/db');

exports.sendContactMessage = async (req, res) => {
  const { infoType, fullName, email, phone, guestCount, message } = req.body;

  if (!fullName || !email || !message) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
  }

  await pool.execute(
    'INSERT INTO contact_messages (info_type, full_name, email, phone, guest_count, message) VALUES (?, ?, ?, ?, ?, ?)',
    [infoType || 'Du lịch', String(fullName).trim(), String(email).trim().toLowerCase(), phone || null, Number(guestCount || 0), String(message).trim()]
  );

  res.status(201).json({ message: 'Gửi liên hệ thành công' });
};

exports.getContactMessages = async (req, res) => {
  const { page = 1, limit = 10, search, is_read, email } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = 'WHERE 1=1';
  const params = [];

  if (search) { where += ' AND (full_name LIKE ? OR message LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (is_read !== undefined && is_read !== '') { where += ' AND is_read = ?'; params.push(Number(is_read)); }
  if (email) { where += ' AND email LIKE ?'; params.push(`%${email}%`); }

  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) as total FROM contact_messages ${where}`, params);
  const [[{ unreadCount }]] = await pool.execute('SELECT COUNT(*) as unreadCount FROM contact_messages WHERE is_read = 0');

  const [items] = await pool.execute(
    `SELECT * FROM contact_messages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

  res.json({ items, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), unreadCount });
};

exports.markContactAsRead = async (req, res) => {
  const { id } = req.params;
  await pool.execute('UPDATE contact_messages SET is_read = 1, updated_at = NOW() WHERE id = ?', [id]);
  res.json({ message: 'Đã đánh dấu đã đọc' });

  // Log
  pool.execute('INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)',
    [req.user.id, req.user.role, 'Đọc liên hệ', `Đánh dấu đã đọc liên hệ ID: ${id}`]).catch(() => {});
};
