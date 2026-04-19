const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const jwtUtil = require('../utils/jwt');
const captchaService = require('../services/captcha.service');
const otpService = require('../services/register-otp.service');
const emailService = require('../services/email.service');

exports.getCaptcha = (req, res) => {
  const { captchaToken, captchaSvg } = captchaService.generate();
  res.json({ captchaToken, captchaSvg });
};

exports.login = async (req, res) => {
  const { email, password, captchaToken, captchaText } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
  }

  if (!captchaToken || !captchaText) {
    return res.status(400).json({ message: 'Vui lòng nhập mã CAPTCHA' });
  }

  if (!captchaService.verify(captchaToken, captchaText)) {
    return res.status(400).json({ message: 'Mã CAPTCHA không đúng' });
  }

  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [String(email).toLowerCase().trim()]
  );

  const user = rows[0];
  if (!user) {
    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
  }

  if (user.is_locked) {
    return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
  }

  const match = await bcrypt.compare(String(password), user.password);
  if (!match) {
    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
  }

  const tokenPayload = { id: user.id, email: user.email, role: user.role };
  const token = jwtUtil.sign(tokenPayload);
  const refreshToken = jwtUtil.signRefresh(tokenPayload);
  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      mustChangePassword: !!user.must_change_password
    }
  });
};

exports.requestRegisterOtp = async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
  }

  const normalEmail = String(email).toLowerCase().trim();

  // Chạy song song: kiểm tra email + hash mật khẩu (tiết kiệm ~100-200ms)
  const [existingResult, passwordHash] = await Promise.all([
    pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [normalEmail]),
    bcrypt.hash(String(password), 10)
  ]);
  const [existing] = existingResult;
  if (existing.length > 0) {
    return res.status(400).json({ message: 'Email đã được đăng ký' });
  }

  const { token, otp } = otpService.generateRegisterSession(
    String(fullName).trim(), normalEmail, passwordHash
  );

  console.log(`[Auth] OTP đăng ký cho ${normalEmail}: ${token.slice(0,8)}... | OTP sẽ được gửi email`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Auth][DEV] OTP Code: ${otp}`);
  }

  // Trả response trước, gửi email nền (không chờ đợi)
  res.json({ registerToken: token, message: 'Mã OTP đã được gửi về email' });

  emailService.sendMail(
    normalEmail,
    'Mã xác nhận đăng ký HK2 Travel',
    `<p>Xin chào <strong>${String(fullName).trim().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}</strong>,</p>
     <p>Mã OTP đăng ký của bạn là: <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p>
     <p>Mã có hiệu lực trong <strong>5 phút</strong>.</p>
     <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.</p>`
  ).catch(e => console.error('[Auth] Gửi OTP email lỗi:', e.message));
};

exports.register = async (req, res) => {
  const { registerToken, otpCode } = req.body;

  if (!registerToken || !otpCode) {
    return res.status(400).json({ message: 'Thiếu token hoặc mã OTP' });
  }

  const session = await otpService.verifyOtp(registerToken, otpCode);
  if (!session || session.type !== 'register') {
    return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn' });
  }

  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [session.email]);
  if (existing.length > 0) {
    return res.status(400).json({ message: 'Email đã được đăng ký' });
  }

  const [result] = await pool.execute(
    'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
    [session.fullName, session.email, session.passwordHash, 'user']
  );

  const tokenPayload = { id: result.insertId, email: session.email, role: 'user' };
  const token = jwtUtil.sign(tokenPayload);
  const refreshToken = jwtUtil.signRefresh(tokenPayload);
  res.status(201).json({
    token,
    refreshToken,
    user: { id: result.insertId, fullName: session.fullName, email: session.email, role: 'user', mustChangePassword: false }
  });
};

exports.requestForgotPasswordOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Vui lòng nhập email' });
  }

  const normalEmail = String(email).toLowerCase().trim();
  const [rows] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [normalEmail]);

  // Luôn trả về thành công để tránh enum email
  if (rows.length === 0) {
    return res.json({ resetToken: 'not-found', message: 'Nếu email tồn tại, mã OTP sẽ được gửi về email' });
  }

  const { token, otp } = otpService.generateForgotSession(normalEmail);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Auth][DEV] Forgot OTP cho ${normalEmail}: ${otp}`);
  }

  // Trả response trước, gửi email nền (không chờ đợi)
  res.json({ resetToken: token, message: 'Mã OTP đã được gửi về email' });

  emailService.sendMail(
    normalEmail,
    'Mã OTP đặt lại mật khẩu HK2 Travel',
    `<p>Mã OTP đặt lại mật khẩu của bạn là: <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p>
     <p>Mã có hiệu lực trong <strong>5 phút</strong>.</p>`
  ).catch(e => console.error('[Auth] Gửi OTP email lỗi:', e.message));
};

exports.resetForgotPassword = async (req, res) => {
  const { resetToken, otpCode, newPassword } = req.body;

  if (!resetToken || !otpCode || !newPassword) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  }

  const session = await otpService.verifyOtp(resetToken, otpCode);
  if (!session || session.type !== 'forgot') {
    return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn' });
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  await pool.execute(
    'UPDATE users SET password = ?, must_change_password = 0 WHERE email = ?',
    [passwordHash, session.email]
  );

  res.json({ message: 'Đặt lại mật khẩu thành công' });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  }

  const [rows] = await pool.execute('SELECT password FROM users WHERE id = ? LIMIT 1', [userId]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Không tìm thấy người dùng' });
  }

  const match = await bcrypt.compare(String(currentPassword), rows[0].password);
  if (!match) {
    return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
  }

  const newHash = await bcrypt.hash(String(newPassword), 10);
  await pool.execute(
    'UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?',
    [newHash, userId]
  );

  res.json({ message: 'Đổi mật khẩu thành công' });
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Thiếu refresh token' });
  }

  try {
    const decoded = jwtUtil.verifyRefresh(refreshToken);
    const [rows] = await pool.execute('SELECT id, email, role, is_locked FROM users WHERE id = ? LIMIT 1', [decoded.id]);
    const user = rows[0];
    if (!user || user.is_locked) {
      return res.status(401).json({ message: 'Tài khoản không hợp lệ' });
    }
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const newToken = jwtUtil.sign(tokenPayload);
    const newRefreshToken = jwtUtil.signRefresh(tokenPayload);
    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch {
    return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
  }
};
