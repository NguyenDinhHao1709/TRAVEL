const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const jwtUtil = require('../utils/jwt');
const otpService = require('../services/register-otp.service');
const emailService = require('../services/email.service');

exports.login = async (req, res) => {
  try {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
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
  } catch (err) {
    console.error('[Auth] login error:', err);
    res.status(500).json({ message: 'Lỗi đăng nhập, vui lòng thử lại' });
  }
};

exports.requestRegisterOtp = async (req, res) => {
  try {
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
    `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
      <div style="background:#0d6efd;padding:20px 24px">
        <h2 style="color:#fff;margin:0">HK2 Travel</h2>
      </div>
      <div style="padding:24px">
        <p>Xin chào <strong>${String(fullName).trim().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản. Nhập mã OTP bên dưới để xác nhận:</p>
        <div style="background:#f5f5f5;border-radius:6px;padding:14px 20px;text-align:center;margin:16px 0">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0d6efd">${otp}</span>
        </div>
        <p>Mã có hiệu lực trong <strong>5 phút</strong>.</p>
        <p style="color:#e53935">Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.</p>
        <p style="color:#888;font-size:13px">Email này được gửi tự động, vui lòng không trả lời.</p>
      </div>
    </div>`
  ).catch(e => console.error('[Auth] Gửi OTP email lỗi:', e.message));
  } catch (err) {
    console.error('[Auth] requestRegisterOtp error:', err);
    res.status(500).json({ message: 'Lỗi xử lý yêu cầu, vui lòng thử lại' });
  }
};

exports.register = async (req, res) => {
  try {
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

  // Log system_logs
  const logService = require('../services/log.service');
  await logService.logAction({
    req,
    userId: result.insertId,
    role: 'user',
    action: 'Đăng ký tài khoản',
    actionDetail: `User đăng ký tài khoản mới: ${session.fullName} (${session.email})`,
    details: { userId: result.insertId, email: session.email, fullName: session.fullName }
  });

  const tokenPayload = { id: result.insertId, email: session.email, role: 'user' };
  const token = jwtUtil.sign(tokenPayload);
  const refreshToken = jwtUtil.signRefresh(tokenPayload);
  res.status(201).json({
    token,
    refreshToken,
    user: { id: result.insertId, fullName: session.fullName, email: session.email, role: 'user', mustChangePassword: false }
  });
  } catch (err) {
    console.error('[Auth] register error:', err);
    res.status(500).json({ message: 'Lỗi đăng ký tài khoản, vui lòng thử lại' });
  }
};

exports.requestForgotPasswordOtp = async (req, res) => {
  try {
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
    `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
      <div style="background:#0d6efd;padding:20px 24px">
        <h2 style="color:#fff;margin:0">HK2 Travel</h2>
      </div>
      <div style="padding:24px">
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhập mã OTP bên dưới để xác nhận:</p>
        <div style="background:#f5f5f5;border-radius:6px;padding:14px 20px;text-align:center;margin:16px 0">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0d6efd">${otp}</span>
        </div>
        <p>Mã có hiệu lực trong <strong>5 phút</strong>.</p>
        <p style="color:#e53935">Nếu bạn không yêu cầu thay đổi mật khẩu, hãy bỏ qua email này.</p>
        <p style="color:#888;font-size:13px">Email này được gửi tự động, vui lòng không trả lời.</p>
      </div>
    </div>`
  ).catch(e => console.error('[Auth] Gửi OTP email lỗi:', e.message));
  } catch (err) {
    console.error('[Auth] requestForgotPasswordOtp error:', err);
    res.status(500).json({ message: 'Lỗi xử lý yêu cầu, vui lòng thử lại' });
  }
};

exports.resetForgotPassword = async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[Auth] resetForgotPassword error:', err);
    res.status(500).json({ message: 'Lỗi đặt lại mật khẩu, vui lòng thử lại' });
  }
};

exports.changePassword = async (req, res) => {
  try {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  }

  const [rows] = await pool.execute('SELECT password, email, full_name FROM users WHERE id = ? LIMIT 1', [userId]);
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

  // Gửi email thông báo bảo mật (nền, không chờ)
  emailService.sendMail(
    rows[0].email,
    'Mật khẩu của bạn vừa được thay đổi - HK2 Travel',
    `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
      <div style="background:#0d6efd;padding:20px 24px">
        <h2 style="color:#fff;margin:0">HK2 Travel</h2>
      </div>
      <div style="padding:24px">
        <p>Xin chào <strong>${rows[0].full_name}</strong>,</p>
        <p>Mật khẩu tài khoản của bạn vừa được thay đổi thành công.</p>
        <p style="color:#e53935">Nếu bạn không thực hiện thay đổi này, vui lòng đổi lại mật khẩu ngay và liên hệ hỗ trợ.</p>
        <p style="color:#888;font-size:13px">Email này được gửi tự động, vui lòng không trả lời.</p>
      </div>
    </div>`
  ).catch(e => console.error('[Auth] Change password notification email error:', e.message));
  } catch (err) {
    console.error('[Auth] changePassword error:', err);
    res.status(500).json({ message: 'Lỗi đổi mật khẩu, vui lòng thử lại' });
  }
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
