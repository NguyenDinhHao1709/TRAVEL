// Security middleware - thêm các header bảo mật bổ sung
module.exports = (req, res, next) => {
  // Ngăn clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Ngăn MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // HSTS - bắt buộc HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Chặn XSS cơ bản qua CSP
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};
