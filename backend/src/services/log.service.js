const pool = require('../config/db');

// Lấy IP từ request
function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    null
  );
}

// Ghi log hệ thống
async function logAction({ req, userId, role, action, actionDetail = '', details = null }) {
  const ip = getIp(req);
  await pool.execute(
    `INSERT INTO system_logs (user_id, role, action, action_detail, ip_address, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [userId, role, action, actionDetail, ip, details ? JSON.stringify(details) : null]
  );
}

module.exports = { logAction };
