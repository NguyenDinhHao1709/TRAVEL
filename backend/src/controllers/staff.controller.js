const pool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getCustomers = async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, full_name, email, phone, created_at FROM users WHERE role = 'user' ORDER BY created_at DESC"
  );
  res.json(rows);
};

exports.getAllStaff = async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, full_name, email, created_at FROM users WHERE role = 'staff' ORDER BY created_at DESC"
  );
  res.json(rows);
};

exports.getStaffById = async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, full_name, email, created_at FROM users WHERE id = ? AND role = 'staff' LIMIT 1",
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
  res.json(rows[0]);
};

exports.createStaff = async (req, res) => {
  const { fullName, email, password } = req.body;
  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
  }

  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase().trim()]);
  if (existing.length > 0) return res.status(400).json({ message: 'Email đã tồn tại' });

  const hash = await bcrypt.hash(String(password), 10);
  const [result] = await pool.execute(
    "INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'staff')",
    [String(fullName).trim(), email.toLowerCase().trim(), hash]
  );
  res.status(201).json({ id: result.insertId, message: 'Tạo nhân viên thành công' });
};

exports.updateStaff = async (req, res) => {
  const { id } = req.params;
  const { fullName, email } = req.body;
  await pool.execute(
    "UPDATE users SET full_name = COALESCE(?, full_name), email = COALESCE(?, email), updated_at = NOW() WHERE id = ? AND role = 'staff'",
    [fullName || null, email ? email.toLowerCase().trim() : null, id]
  );
  res.json({ message: 'Cập nhật nhân viên thành công' });
};

exports.deleteStaff = async (req, res) => {
  await pool.execute("DELETE FROM users WHERE id = ? AND role = 'staff'", [req.params.id]);
  res.json({ message: 'Xóa nhân viên thành công' });
};
