const pool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getMe = async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT id, full_name, email, role, phone, is_locked, must_change_password, created_at FROM users WHERE id = ? LIMIT 1',
    [req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
  res.json(rows[0]);
};

exports.updateMe = async (req, res) => {
  const { fullName, phone } = req.body;
  await pool.execute(
    'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), updated_at = NOW() WHERE id = ?',
    [fullName || null, phone || null, req.user.id]
  );
  res.json({ message: 'Cập nhật thông tin thành công' });
};

exports.getAllUsers = async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, full_name, email, role, phone, is_locked, created_at FROM users ORDER BY created_at DESC"
  );
  res.json(rows);
};

exports.getUserById = async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT id, full_name, email, role, phone, is_locked, created_at FROM users WHERE id = ? LIMIT 1',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
  res.json(rows[0]);
};

exports.createUser = async (req, res) => {
  const { fullName, email, password, role } = req.body;
  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
  }
  const hash = await bcrypt.hash(String(password), 10);
  const [result] = await pool.execute(
    'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
    [String(fullName).trim(), email.toLowerCase().trim(), hash, role || 'user']
  );
  res.status(201).json({ id: result.insertId, message: 'Tạo người dùng thành công' });
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { fullName, phone } = req.body;

  // Chỉ cho phép user sửa thông tin của mình
  if (req.user?.role === 'user' && String(req.user.id) !== String(id)) {
    return res.status(403).json({ message: 'Không có quyền' });
  }

  await pool.execute(
    'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), updated_at = NOW() WHERE id = ?',
    [fullName || null, phone || null, id]
  );
  res.json({ message: 'Cập nhật thông tin thành công' });
};

exports.deleteUser = async (req, res) => {
  await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'Xóa người dùng thành công' });
};
