const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET phải được đặt trong biến môi trường production'); })()
    : 'hk2travel_default_secret_dev_only'
);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_SECRET = process.env.REFRESH_SECRET || JWT_SECRET + '_refresh';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';
const JWT_ALGORITHM = 'HS256';

module.exports = {
  sign: (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM }),
  verify: (token) => jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }),
  signRefresh: (payload) => jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN, algorithm: JWT_ALGORITHM }),
  verifyRefresh: (token) => jwt.verify(token, REFRESH_SECRET, { algorithms: [JWT_ALGORITHM] })
};
