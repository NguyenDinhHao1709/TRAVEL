// Script xóa log hệ thống quá 30 ngày
const pool = require('../config/db');

async function deleteOldLogs() {
  const days = 30; // Số ngày giữ log
  try {
    const [result] = await pool.execute(
      'DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    console.log(`Đã xóa ${result.affectedRows} log cũ hơn ${days} ngày.`);
  } catch (err) {
    console.error('Lỗi xóa log cũ:', err);
  } finally {
    process.exit();
  }
}

deleteOldLogs();
