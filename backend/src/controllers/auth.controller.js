const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken } = require('../utils/jwt');
const { generateCaptcha, verifyCaptcha } = require('../services/captcha.service');
const { createRegisterOtp, verifyRegisterOtp } = require('../services/register-otp.service');
const { createForgotPasswordOtp, verifyForgotPasswordOtp } = require('../services/forgot-password-otp.service');
const { sendRegisterOtpEmail, sendForgotPasswordOtpEmail } = require('../services/email.service');

const normalizeFullName = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const isValidFullName = (value) => {
  const normalized = normalizeFullName(value);
  return normalized.length >= 2 && /^[\p{L}\s]+$/u.test(normalized);
};

const requestRegisterOtp = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const normalizedFullName = normalizeFullName(fullName);

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!isValidFullName(normalizedFullName)) {
      return res.status(400).json({ message: 'Họ tên chỉ được chứa chữ cái và khoảng trắng' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const { registerToken, otpCode, expiresInSeconds } = createRegisterOtp({
      fullName: normalizedFullName,
      email,
      password
    });

    setImmediate(async () => {
      try {
        await sendRegisterOtpEmail({
          toEmail: email,
          fullName,
          otpCode
        });
      } catch (mailError) {
        console.error('Send register OTP email failed:', mailError.message);
      }
    });

    return res.status(200).json({
      message: 'Yêu cầu OTP đã được tạo, mã đang được gửi về email của bạn',
      registerToken,
      expiresInSeconds
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const register = async (req, res) => {
  try {
    const { registerToken, otpCode } = req.body;

    if (!registerToken || !otpCode) {
      return res.status(400).json({ message: 'Thiếu mã xác thực đăng ký' });
    }

    const otpPayload = verifyRegisterOtp({ registerToken, otpCode });
    if (!otpPayload) {
      return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn' });
    }

    const normalizedFullName = normalizeFullName(otpPayload.fullName);
    if (!isValidFullName(normalizedFullName)) {
      return res.status(400).json({ message: 'Họ tên không hợp lệ' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [otpPayload.email]);
    if (existing.length) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
      [
        normalizedFullName,
        otpPayload.email,
        await bcrypt.hash(String(otpPayload.password || ''), 10),
        'user'
      ]
    );

    const token = signToken({ id: result.insertId, email: otpPayload.email, role: 'user' });
    return res.status(201).json({
      token,
      user: {
        id: result.insertId,
        fullName: normalizedFullName,
        email: otpPayload.email,
        role: 'user'
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const requestForgotPasswordOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email' });
    }

    const [rows] = await pool.query(
      'SELECT id, full_name, email FROM users WHERE email = ? AND COALESCE(is_deleted, 0) = 0 LIMIT 1',
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Email chưa được đăng ký' });
    }

    const { resetToken, otpCode, expiresInSeconds } = createForgotPasswordOtp({
      userId: rows[0].id,
      email: rows[0].email
    });

    await sendForgotPasswordOtpEmail({
      toEmail: rows[0].email,
      fullName: rows[0].full_name,
      otpCode
    });

    return res.json({
      message: 'Đã gửi mã OTP đặt lại mật khẩu về email của bạn',
      resetToken,
      expiresInSeconds
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resetPasswordWithOtp = async (req, res) => {
  try {
    const { resetToken, otpCode, newPassword } = req.body || {};

    if (!resetToken || !otpCode || !newPassword) {
      return res.status(400).json({ message: 'Thiếu thông tin đặt lại mật khẩu' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const otpPayload = verifyForgotPasswordOtp({ resetToken, otpCode });
    if (!otpPayload) {
      return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn' });
    }

    const hashed = await bcrypt.hash(String(newPassword), 10);
    const [result] = await pool.query(
      'UPDATE users SET password = ?, must_change_password = 0 WHERE id = ? AND COALESCE(is_deleted, 0) = 0',
      [hashed, otpPayload.userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }

    return res.json({ message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, captchaToken, captchaText } = req.body;

    const captchaOk = verifyCaptcha({ token: captchaToken, input: captchaText });
    if (!captchaOk) {
      return res.status(400).json({ message: 'Mã CAPTCHA không đúng hoặc đã hết hạn' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];

    if (Number(user.is_deleted || 0) === 1) {
      return res.status(403).json({ message: 'Tài khoản đã bị xóa khỏi hệ thống' });
    }

    if (Number(user.is_locked || 0) === 1) {
      return res.status(403).json({ message: 'Tài khoản đang bị khóa' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        mustChangePassword: Number(user.must_change_password || 0) === 1
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCaptcha = async (req, res) => {
  try {
    return res.json(generateCaptcha());
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const [rows] = await pool.query('SELECT password FROM users WHERE id = ? AND COALESCE(is_deleted,0) = 0', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', [hashed, req.user.id]);

    return res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const me = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, created_at FROM users WHERE id = ? AND COALESCE(is_deleted, 0) = 0',
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  requestRegisterOtp,
  requestForgotPasswordOtp,
  resetPasswordWithOtp,
  login,
  me,
  changePassword,
  getCaptcha
};
