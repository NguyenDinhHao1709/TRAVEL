const crypto = require('crypto');

const OTP_TTL_MS = 5 * 60 * 1000;
const otpStore = new Map();
const emailTokenIndex = new Map();

const cleanupExpired = () => {
  const now = Date.now();
  for (const [token, item] of otpStore.entries()) {
    if (item.expiresAt <= now) {
      otpStore.delete(token);
      if (item.email) {
        emailTokenIndex.delete(String(item.email).toLowerCase());
      }
    }
  }
};

const createOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const createRegisterOtp = ({ fullName, email, password }) => {
  cleanupExpired();

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const oldToken = emailTokenIndex.get(normalizedEmail);
  if (oldToken) {
    otpStore.delete(oldToken);
  }

  const registerToken = crypto.randomUUID();
  const otpCode = createOtpCode();

  otpStore.set(registerToken, {
    fullName: String(fullName || '').trim(),
    email: normalizedEmail,
    password: String(password || ''),
    otpCode,
    expiresAt: Date.now() + OTP_TTL_MS
  });

  emailTokenIndex.set(normalizedEmail, registerToken);

  return {
    registerToken,
    otpCode,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000)
  };
};

const verifyRegisterOtp = ({ registerToken, otpCode }) => {
  cleanupExpired();

  const token = String(registerToken || '');
  const data = otpStore.get(token);
  if (!data) return null;

  const input = String(otpCode || '').trim();
  if (!input || input !== data.otpCode) {
    return null;
  }

  otpStore.delete(token);
  emailTokenIndex.delete(String(data.email || '').toLowerCase());

  return {
    fullName: data.fullName,
    email: data.email,
    password: data.password
  };
};

module.exports = {
  createRegisterOtp,
  verifyRegisterOtp
};
