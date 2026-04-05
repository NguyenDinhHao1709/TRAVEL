const rateLimit = require('express-rate-limit');

const buildLimiter = ({ windowMs, max, message }) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message }
});

const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many auth requests, please try again later.'
});

const loginLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: 'Too many login attempts, please try again in 15 minutes.'
});

const otpRequestLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: 6,
  message: 'Too many OTP requests, please wait before trying again.'
});

module.exports = {
  authLimiter,
  loginLimiter,
  otpRequestLimiter
};
