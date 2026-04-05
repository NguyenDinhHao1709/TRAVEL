const pool = require('../config/db');

const VN_MOBILE_PREFIXES = [
  '032', '033', '034', '035', '036', '037', '038', '039',
  '052', '055', '056', '058', '059',
  '070', '076', '077', '078', '079',
  '081', '082', '083', '084', '085', '086', '087', '088', '089',
  '090', '091', '092', '093', '094', '096', '097', '098', '099'
];

const isValidGmail = (value) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(String(value || '').trim());

const isValidVietnamPhone = (value) => {
  const digitsOnly = String(value || '').replace(/\D/g, '');
  if (digitsOnly.length !== 10) return false;
  return VN_MOBILE_PREFIXES.some((prefix) => digitsOnly.startsWith(prefix));
};

const createContactMessage = async (req, res) => {
  try {
    const {
      infoType,
      fullName,
      email,
      phone,
      guestCount = 0,
      message
    } = req.body;

    if (!infoType || !fullName || !email || !phone || !message) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ các trường bắt buộc.' });
    }

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').replace(/\D/g, '');
    const normalizedInfoType = String(infoType || '').trim();
    const derivedSubject = `Liên hệ ${normalizedInfoType || 'khác'}`;

    if (!isValidGmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Email không hợp lệ.' });
    }

    if (!isValidVietnamPhone(normalizedPhone)) {
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ.' });
    }

    const parsedGuestCount = Number(guestCount || 0);

    const [result] = await pool.query(
      `INSERT INTO contact_messages
      (info_type, full_name, email, phone, company_name, guest_count, address, subject, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedInfoType,
        fullName,
        normalizedEmail,
        normalizedPhone,
        '',
        Number.isFinite(parsedGuestCount) ? parsedGuestCount : 0,
        '',
        derivedSubject,
        message
      ]
    );

    await pool.query(
      'INSERT INTO system_logs (action, actor_role) VALUES (?, ?)',
      [`Liên hệ mới #${result.insertId} từ ${fullName} (${email})`, 'system']
    );

    return res.status(201).json({
      message: 'Gửi liên hệ thành công. Bộ phận nhân viên và quản trị đã nhận được thông báo.',
      id: result.insertId
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getContactMessages = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM contact_messages
       ORDER BY is_read ASC, created_at DESC
       LIMIT 300`
    );

    const unreadCount = rows.filter((item) => Number(item.is_read) === 0).length;

    return res.json({
      unreadCount,
      items: rows
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markContactMessageAsRead = async (req, res) => {
  try {
    await pool.query('UPDATE contact_messages SET is_read = 1 WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Đã đánh dấu đã đọc.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createContactMessage,
  getContactMessages,
  markContactMessageAsRead
};