const rateLimit = require('express-rate-limit');

// Skip rate limiting in development for automated testing
const skipInDev = () => process.env.NODE_ENV !== 'production';

const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 200,
  skip: skipInDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: skipInDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quá nhiều thử đăng nhập, vui lòng thử lại sau 15 phút' }
});

// Giới hạn gửi OTP: tối đa 3 lần / 5 phút mỗi IP (chống spam email)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 3,
  skip: skipInDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Bạn đã gửi quá nhiều mã OTP. Vui lòng thử lại sau 5 phút' }
});

module.exports = defaultLimiter;
module.exports.authLimiter = authLimiter;
module.exports.otpLimiter = otpLimiter;
