const crypto = require('crypto');

// In-memory store (sản xuất nên dùng Redis)
const otpStore = new Map();
const OTP_TTL = 5 * 60 * 1000; // 5 phút

// Hash OTP bằng SHA-256 (nhanh hơn bcrypt rất nhiều, OTP chỉ sống 5 phút nên không cần bcrypt)
const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

// Dọn sạch OTP hết hạn
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of otpStore.entries()) {
    if (entry.expiresAt < now) otpStore.delete(token);
  }
}, 60 * 1000);

module.exports = {
  generateRegisterSession: (fullName, email, passwordHash) => {
    const otp = String(crypto.randomInt(100000, 999999));
    const token = crypto.randomBytes(24).toString('hex');
    otpStore.set(token, {
      type: 'register',
      fullName,
      email,
      passwordHash,
      otpHash: hashOtp(otp),
      expiresAt: Date.now() + OTP_TTL
    });
    return { token, otp };
  },

  generateForgotSession: (email) => {
    const otp = String(crypto.randomInt(100000, 999999));
    const token = crypto.randomBytes(24).toString('hex');
    // Xóa session cũ cho email này
    for (const [k, v] of otpStore.entries()) {
      if (v.email === email && v.type === 'forgot') otpStore.delete(k);
    }
    otpStore.set(token, {
      type: 'forgot',
      email,
      otpHash: hashOtp(otp),
      expiresAt: Date.now() + OTP_TTL
    });
    return { token, otp };
  },

  verifyOtp: (token, otp) => {
    const entry = otpStore.get(String(token || ''));
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      otpStore.delete(token);
      return null;
    }
    if (hashOtp(otp) !== entry.otpHash) return null;
    otpStore.delete(token);
    return entry;
  }
};
