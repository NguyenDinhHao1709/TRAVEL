const crypto = require('crypto');

const OTP_TTL_MS = 5 * 60 * 1000;
const otpStore = new Map();
const userTokenIndex = new Map();

const cleanupExpired = () => {
  const now = Date.now();
  for (const [token, item] of otpStore.entries()) {
    if (item.expiresAt <= now) {
      otpStore.delete(token);
      userTokenIndex.delete(String(item.email || '').toLowerCase());
    }
  }
};

const createOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const createForgotPasswordOtp = ({ userId, email }) => {
  cleanupExpired();

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const oldToken = userTokenIndex.get(normalizedEmail);
  if (oldToken) {
    otpStore.delete(oldToken);
  }

  const resetToken = crypto.randomUUID();
  const otpCode = createOtpCode();

  otpStore.set(resetToken, {
    userId: Number(userId),
    email: normalizedEmail,
    otpCode,
    expiresAt: Date.now() + OTP_TTL_MS
  });

  userTokenIndex.set(normalizedEmail, resetToken);

  return {
    resetToken,
    otpCode,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000)
  };
};

const verifyForgotPasswordOtp = ({ resetToken, otpCode }) => {
  cleanupExpired();

  const token = String(resetToken || '');
  const data = otpStore.get(token);
  if (!data) return null;

  const input = String(otpCode || '').trim();
  if (!input || input !== data.otpCode) {
    return null;
  }

  otpStore.delete(token);
  userTokenIndex.delete(String(data.email || '').toLowerCase());

  return {
    userId: data.userId,
    email: data.email
  };
};

module.exports = {
  createForgotPasswordOtp,
  verifyForgotPasswordOtp
};
